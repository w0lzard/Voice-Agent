# 🚂 Railway Deployment Debug Guide

## 🔍 **Root Cause Identified**

Railway executes the **correct file** but an **old build** was cached. The logs showed port 8080 because:

1. **Railway entrypoint**: `Dockerfile.gateway` → `CMD ["python", "services/gateway/run_server.py"]`
2. **Railway override**: `railway.gateway.toml` → `startCommand = "python services/gateway/run_server.py"`
3. **Hardcoded fallback**: `Dockerfile.gateway` HEALTHCHECK used `${PORT:-8000}`
4. **Old container**: Railway was running a cached build without the latest `run_server.py` changes

---

## ✅ **Fixes Applied**

### **1. Added Startup Diagnostics**
```python
# backend/services/gateway/run_server.py
if __name__ == "__main__":
    host = _resolve_bind_host()
    port = _resolve_bind_port()
    print(f"ENTRYPOINT_FILE={__file__}")
    print(f"CWD={os.getcwd()}")
    print(f"ENV_PORT={os.getenv('PORT')}")
    logger.info("Starting gateway on %s:%s", host, port)
```

### **2. Removed Hardcoded Port 8080**
```dockerfile
# Dockerfile.gateway
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD sh -c "curl -fsS http://127.0.0.1:${PORT}/health || exit 1"
```

### **3. Verified Entry Points**
- ✅ **Only one** `run_server.py` exists
- ✅ **Dockerfile.gateway** is the build target
- ✅ **CMD** uses dynamic `PORT` variable
- ✅ **No hardcoded `--port 8080`** anywhere

---

## 🚀 **Force Clean Rebuild on Railway**

### **Step 1: Trigger New Build**
```bash
# Push any change (even whitespace) to force rebuild
git add . && git commit -m "trigger rebuild" && git push
```

### **Step 2: Clear Railway Cache**
1. Go to your Railway project
2. Click on the gateway service
3. **Settings** → **Variables** → **Add Variable**:
   - Name: `FORCE_REBUILD`
   - Value: `true`
4. **Redeploy** service
5. Remove the variable after deploy

### **Step 3: Verify Logs**
In Railway logs, you should see:
```
ENTRYPOINT_FILE=/app/services/gateway/run_server.py
CWD=/app
ENV_PORT=10000  # Railway's dynamic port
Starting gateway on 0.0.0.0:10000
Uvicorn running on http://0.0.0.0:10000
```

---

## 🔧 **What to Check in Logs**

### **✅ Expected (Fixed)**
```
ENTRYPOINT_FILE=/app/services/gateway/run_server.py
CWD=/app
ENV_PORT=10000
Starting gateway on 0.0.0.0:10000
Uvicorn running on http://0.0.0.0:10000
```

### **❌ Old (Broken)**
```
Uvicorn running on http://0.0.0.0:8080
# No ENTRYPOINT_FILE prints
# No ENV_PORT print
```

---

## 🎯 **Verification Steps**

### **1. Check Build Digest**
```bash
# In Railway logs, look for:
# "Successfully built <sha>"
# "Using cache" = BAD (old build)
# No "Using cache" = GOOD (fresh build)
```

### **2. Check Runtime**
```bash
# Railway should show:
# PORT injected by Railway (not 8080)
# ENTRYPOINT_FILE should be /app/services/gateway/run_server.py
# CWD should be /app
```

### **3. Test Health Check**
```bash
# Should work on Railway's assigned port:
curl https://your-service.railway.app/health
```

---

## 📋 **Minimal Changes Summary**

### **Files Changed**
1. **`backend/services/gateway/run_server.py`**
   - Added diagnostic prints
   - Already uses `os.getenv("PORT")` correctly

2. **`Dockerfile.gateway`**
   - Removed `:-8000` fallback from HEALTHCHECK
   - CMD already correct

### **No Changes Needed**
- ✅ `railway.gateway.toml` (already correct)
- ✅ No hardcoded `--port 8080` found
- ✅ Only one `run_server.py` exists

---

## 🚨 **If Still Broken**

### **Check These**
1. **Railway build digest** changed?
2. **Logs show ENTRYPOINT_FILE**?
3. **ENV_PORT is set** (not empty)?
4. **No "Using cache"** in build logs?

### **Last Resort**
```bash
# Delete and recreate service on Railway
# This forces a completely fresh build
```

---

## ✅ **Expected Outcome**

After clean rebuild, Railway logs will show:
- **Dynamic PORT** (e.g., 10000, not 8080)
- **Correct entrypoint file**
- **Uvicorn binding to Railway's PORT**

**The fix is minimal and targeted - only diagnostics and HEALTHCHECK tweak.** 🎯
