"""Authentication service."""
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from shared.database.connection import get_database
from .models import (
    User, Workspace, ApiKey, RefreshToken,
    SignupRequest, LoginRequest, TokenResponse, UserResponse,
    CreateApiKeyRequest, ApiKeyResponse
)
from .password import hash_password, verify_password
from .jwt_handler import (
    create_access_token, create_refresh_token, verify_token,
    get_token_expiry_seconds
)

logger = logging.getLogger("auth_service")


class AuthService:
    """Authentication service for user management."""
    
    @staticmethod
    def _hash_api_key(key: str) -> str:
        """Hash an API key using SHA-256."""
        return hashlib.sha256(key.encode()).hexdigest()
    
    @staticmethod
    def _generate_otp() -> str:
        """Generate a cryptographically secure 6-digit OTP."""
        return f"{100000 + secrets.randbelow(900000)}"

    @staticmethod
    async def _store_otp(user_id: str, otp: str):
        """Store OTP in the database with 10-minute expiry."""
        db = get_database()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"otp_code": otp, "otp_expires_at": expires_at}}
        )

    @staticmethod
    async def signup(request: SignupRequest) -> Tuple[User, Workspace]:
        """
        Register a new user, create their workspace, and send OTP.

        Returns:
            Tuple of (user, workspace) — tokens issued only after email verification
        """
        db = get_database()

        # Check if email already exists
        existing = await db.users.find_one({"email": request.email})
        if existing:
            raise ValueError("Email already registered")

        # Create workspace
        workspace_name = request.workspace_name or f"{request.name}'s Workspace"
        workspace = Workspace(
            name=workspace_name,
            owner_id="",
        )

        # Create user (unverified)
        user = User(
            email=request.email,
            password_hash=hash_password(request.password),
            name=request.name,
            workspace_id=workspace.workspace_id,
            role="owner",
            email_verified=False,
        )
        workspace.owner_id = user.user_id

        # Save to database
        await db.workspaces.insert_one(workspace.model_dump())
        await db.users.insert_one(user.model_dump())

        # Create indexes (if not exist)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("workspace_id")
        await db.api_keys.create_index("key_hash", unique=True)
        await db.api_keys.create_index("workspace_id")

        # Generate and send OTP
        otp = AuthService._generate_otp()
        await AuthService._store_otp(user.user_id, otp)

        email_sent = False
        email_error = None
        try:
            from shared.email_service import send_otp_email
            await send_otp_email(user.email, otp, user.name)
            email_sent = True
        except Exception as e:
            email_error = str(e)
            logger.error(f"Failed to send OTP email to {user.email}: {e}")
            # OTP is in DB — user can still verify via /auth/resend-code once
            # the email service is configured correctly.
            logger.warning(f"OTP for {user.email}: {otp}")

        return user, workspace, email_sent, email_error, otp

    @staticmethod
    async def verify_otp(email: str, code: str) -> Tuple[User, TokenResponse]:
        """
        Verify OTP and mark email as verified.

        Returns:
            Tuple of (user, tokens) on success
        """
        db = get_database()

        user_data = await db.users.find_one({"email": email})
        if not user_data:
            raise ValueError("User not found")

        user = User(**user_data)

        if user.email_verified:
            # Already verified — just return tokens
            tokens = AuthService._create_tokens(user)
            return user, tokens

        if not user.otp_code:
            raise ValueError("No verification code found. Please request a new one.")

        now = datetime.now(timezone.utc)
        expires = user.otp_expires_at
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

        if expires is None or now > expires:
            raise ValueError("Verification code has expired. Please request a new one.")

        if user.otp_code != code:
            raise ValueError("Invalid verification code.")

        # Mark as verified and clear OTP
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"email_verified": True, "otp_code": None, "otp_expires_at": None}}
        )
        user.email_verified = True

        tokens = AuthService._create_tokens(user)
        return user, tokens

    @staticmethod
    async def resend_otp(email: str) -> bool:
        """Resend OTP to the given email."""
        db = get_database()

        user_data = await db.users.find_one({"email": email})
        if not user_data:
            # Return True for security (don't reveal if email exists)
            return True

        user = User(**user_data)
        if user.email_verified:
            return True

        otp = AuthService._generate_otp()
        await AuthService._store_otp(user.user_id, otp)

        email_sent = False
        try:
            from shared.email_service import send_otp_email
            await send_otp_email(user.email, otp, user.name)
            email_sent = True
        except Exception as e:
            logger.error(f"Failed to resend OTP to {user.email}: {e}")
            logger.warning(f"OTP for {user.email}: {otp}")

        return email_sent, otp
    
    @staticmethod
    async def login(request: LoginRequest) -> Tuple[User, TokenResponse]:
        """
        Authenticate user and return tokens.
        
        Returns:
            Tuple of (user, tokens)
        """
        db = get_database()
        
        # Find user
        user_data = await db.users.find_one({"email": request.email})
        if not user_data:
            raise ValueError("Invalid email or password")
        
        user = User(**user_data)
        
        # Check password
        if not verify_password(request.password, user.password_hash):
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": {"failed_login_attempts": 1}}
            )
            raise ValueError("Invalid email or password")

        # Block login if email not verified — send a fresh OTP
        if not user.email_verified:
            otp = AuthService._generate_otp()
            await AuthService._store_otp(user.user_id, otp)
            try:
                from shared.email_service import send_otp_email
                await send_otp_email(user.email, otp, user.name)
            except Exception as e:
                logger.error(f"Failed to send OTP on login to {user.email}: {e}")
                logger.warning(f"OTP for {user.email}: {otp}")
            raise ValueError(f"EMAIL_NOT_VERIFIED:{user.email}")

        # Reset failed attempts and update last login
        await db.users.update_one(
            {"user_id": user.user_id},
            {
                "$set": {
                    "failed_login_attempts": 0,
                    "last_login": datetime.now(timezone.utc),
                }
            }
        )
        
        # Generate tokens
        tokens = AuthService._create_tokens(user)
        
        # Preload session data into Redis for fast access
        try:
            from shared.cache import SessionCache
            user_cache_data = {
                "user_id": user.user_id,
                "email": user.email,
                "name": user.name,
                "workspace_id": user.workspace_id,
                "role": user.role,
            }
            
            # Fetch workspace data
            workspace_doc = await db.workspaces.find_one({"workspace_id": user.workspace_id})
            workspace_cache_data = None
            if workspace_doc:
                if "_id" in workspace_doc:
                    del workspace_doc["_id"]
                workspace_cache_data = workspace_doc
            
            await SessionCache.preload_session(
                user.user_id, 
                user.workspace_id, 
                user_cache_data,
                workspace_cache_data
            )
        except Exception as e:
            # Don't fail login if cache fails
            import logging
            logging.getLogger("auth").warning(f"Session cache preload failed: {e}")
        
        return user, tokens
    
    @staticmethod
    async def refresh_tokens(refresh_token: str) -> Optional[TokenResponse]:
        """
        Refresh access token using refresh token.
        
        Returns:
            New tokens if valid, None if invalid
        """
        # Verify refresh token
        payload = verify_token(refresh_token, token_type="refresh")
        if not payload:
            return None
        
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        # Get user
        db = get_database()
        user_data = await db.users.find_one({"user_id": user_id})
        if not user_data:
            return None
        
        user = User(**user_data)
        
        # Generate new tokens
        return AuthService._create_tokens(user)
    
    @staticmethod
    async def logout(user_id: str) -> bool:
        """
        Logout user and invalidate session cache.
        
        Returns:
            True if session was invalidated
        """
        try:
            from shared.cache import SessionCache
            await SessionCache.invalidate_session(user_id)
            return True
        except Exception as e:
            import logging
            logging.getLogger("auth").warning(f"Session invalidation failed: {e}")
            return False
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[User]:
        """Get user by ID."""
        db = get_database()
        user_data = await db.users.find_one({"user_id": user_id})
        return User(**user_data) if user_data else None
    
    @staticmethod
    async def get_user_from_token(token: str) -> Optional[User]:
        """Get user from access token."""
        payload = verify_token(token, token_type="access")
        if not payload:
            return None
        
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        return await AuthService.get_user_by_id(user_id)
    
    @staticmethod
    async def create_api_key(
        user: User, 
        request: CreateApiKeyRequest
    ) -> Tuple[ApiKey, str]:
        """
        Create a new API key for the user.
        
        Returns:
            Tuple of (api_key, raw_key)
        """
        db = get_database()
        
        # Generate API key: vk_<random>
        raw_key = f"vk_{secrets.token_urlsafe(32)}"
        key_prefix = raw_key[:12]
        key_hash = AuthService._hash_api_key(raw_key)
        
        api_key = ApiKey(
            key_hash=key_hash,
            key_prefix=key_prefix,
            name=request.name,
            workspace_id=user.workspace_id,
            user_id=user.user_id,
            permissions=request.permissions,
        )
        
        await db.api_keys.insert_one(api_key.model_dump())
        
        return api_key, raw_key
    
    @staticmethod
    async def list_api_keys(workspace_id: str) -> list:
        """List all API keys for a workspace."""
        db = get_database()
        cursor = db.api_keys.find({"workspace_id": workspace_id, "is_active": True})
        keys = []
        async for key_data in cursor:
            keys.append(ApiKey(**key_data))
        return keys
    
    @staticmethod
    async def delete_api_key(api_key_id: str, workspace_id: str) -> bool:
        """Delete (deactivate) an API key."""
        db = get_database()
        result = await db.api_keys.update_one(
            {"api_key_id": api_key_id, "workspace_id": workspace_id},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0
    
    @staticmethod
    async def get_user_from_api_key(api_key: str) -> Optional[Tuple[User, str]]:
        """
        Validate API key and return user and workspace_id.
        
        Returns:
            Tuple of (user, workspace_id) if valid, None if invalid
        """
        db = get_database()
        
        # Check for Internal System Key
        from shared.settings import config
        if api_key == config.INTERNAL_API_KEY:
            # Return a "System User"
            system_user = User(
                user_id="system",
                workspace_id="system", # Or handle as global admin
                email="system@vobiz.ai",
                name="System Service",
                role="owner",
                password_hash=""
            )
            # If we need a specific workspace, we might need to pass it or handle it
            # For analysis, we usually operate on the call's workspace
            return system_user, "system"
        
        # Hash the key
        key_hash = AuthService._hash_api_key(api_key)
        
        # Find the key
        key_data = await db.api_keys.find_one({
            "key_hash": key_hash,
            "is_active": True
        })
        
        if not key_data:
            return None
        
        api_key_obj = ApiKey(**key_data)
        
        # Update last used
        await db.api_keys.update_one(
            {"api_key_id": api_key_obj.api_key_id},
            {"$set": {"last_used": datetime.now(timezone.utc)}}
        )
        
        # Get user
        user = await AuthService.get_user_by_id(api_key_obj.user_id)
        if not user:
            return None
        
        return user, api_key_obj.workspace_id
    
    @staticmethod
    async def phone_login(phone: str) -> Tuple[User, TokenResponse]:
        """
        Find or create a user by phone number and issue tokens.

        Returns:
            Tuple of (user, tokens)
        """
        db = get_database()

        user_data = await db.users.find_one({"phone": phone})
        if user_data:
            user = User(**user_data)
        else:
            # Create a new user + workspace for this phone number
            workspace = Workspace(
                name=f"User's Workspace",
                owner_id="",
            )
            placeholder_email = f"{phone.lstrip('+').replace(' ', '')}@phone.local"
            user = User(
                email=placeholder_email,
                password_hash=secrets.token_hex(32),
                name="User",
                phone=phone,
                workspace_id=workspace.workspace_id,
                role="owner",
                email_verified=True,
            )
            workspace.owner_id = user.user_id
            await db.workspaces.insert_one(workspace.model_dump())
            await db.users.insert_one(user.model_dump())
            logger.info(f"Created new phone-based user for {phone}: {user.user_id}")

        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )

        tokens = AuthService._create_tokens(user)
        return user, tokens

    @staticmethod
    async def send_phone_otp(phone: str, name: str) -> bool:
        """Send OTP via SMS and store in MongoDB."""
        import httpx
        import re

        normalized = re.sub(r'[\s\-]', '', phone)

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://vbspuresult.org.in/Account/SendOtp",
                params={"mobile": normalized, "Name": name},
            )
            resp.raise_for_status()

        otp = resp.text.strip().strip('"').strip("'")
        if not re.fullmatch(r'\d{6}', otp):
            raise ValueError(f"Unexpected OTP response: {resp.text!r}")

        db = get_database()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        await db.phone_otps.update_one(
            {"phone": normalized},
            {"$set": {"phone": normalized, "otp": otp, "expires_at": expires_at}},
            upsert=True,
        )

        # Create TTL index (no-op if already exists)
        try:
            await db.phone_otps.create_index("expires_at", expireAfterSeconds=0)
        except Exception:
            pass

        return True

    @staticmethod
    async def verify_phone_otp(phone: str, otp: str) -> Tuple[User, TokenResponse]:
        """Verify OTP from MongoDB and issue tokens."""
        import re

        normalized = re.sub(r'[\s\-]', '', phone)

        db = get_database()
        record = await db.phone_otps.find_one({"phone": normalized})

        if not record:
            raise ValueError("OTP not found or already used. Please request a new one.")

        expires_at = record.get("expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                await db.phone_otps.delete_one({"phone": normalized})
                raise ValueError("OTP has expired. Please request a new one.")

        if record.get("otp") != otp:
            raise ValueError("Invalid OTP. Please try again.")

        await db.phone_otps.delete_one({"phone": normalized})

        return await AuthService.phone_login(normalized)

    @staticmethod
    def _create_tokens(user: User) -> TokenResponse:
        """Create access and refresh tokens for a user."""
        token_data = {
            "user_id": user.user_id,
            "workspace_id": user.workspace_id,
            "email": user.email,
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"user_id": user.user_id})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=get_token_expiry_seconds(),
        )
