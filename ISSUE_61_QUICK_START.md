# Quick Start Guide: Content Upload Interface with IPFS (#61)

## 🚀 Quick Setup (5 minutes)

### 1. Configure Environment

**Backend (.env):**
```env
PINATA_API_KEY=<your_pinata_api_key>
PINATA_SECRET_API_KEY=<your_pinata_secret_key>
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 2. Install & Run

```bash
# Backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### 3. Test Upload

Visit `http://localhost:3000` → Click "Upload Content" → Select file → Publish

---

## 📚 Files Overview

### Backend Service
- **File:** `backend/services/ipfsService.js`
- **Purpose:** IPFS upload with progress tracking and retry logic
- **Key Functions:** 
  - `uploadFileToIPFS()` - Upload with progress
  - `verifyCredentials()` - Verify Pinata access
  - `getGatewayUrl()` - Get IPFS gateway URL

### Frontend Hook
- **File:** `frontend/src/hooks/useIPFSUpload.ts`
- **Purpose:** React hook for uploads
- **Usage:**
  ```typescript
  const { uploadToIPFS, progress } = useIPFSUpload();
  const url = await uploadToIPFS(file);
  ```

### Upload Component
- **File:** `frontend/src/components/ContentUploadInterface.tsx`
- **Purpose:** Complete UI for creators
- **Features:** Drag-drop, progress bar, token gating, etc.

### Backend Endpoint
- **Route:** `POST /api/content/upload-ipfs`
- **Purpose:** Handle IPFS uploads with retry
- **Response:** `{ ipfsHash, ipfsUrl, gatewayUrl, ... }`

---

## 🎯 Usage

### For Creators
1. Click "Upload Content"
2. Drag files or browse
3. Fill title, price, description
4. Optional: Enable token gating
5. Click "Publish to IPFS"
6. Monitor progress
7. Done!

### For Developers
```javascript
// Use the IPFS service
const { uploadFileToIPFS } = require('./services/ipfsService');
const hash = await uploadFileToIPFS(buffer, 'file.mp4');

// Or use the hook
const { uploadToIPFS } = useIPFSUpload();
const url = await uploadToIPFS(file);
```

---

## ⚙️ Configuration

| Setting | Value | Default |
|---------|-------|---------|
| Max File Size | 100MB | 100MB |
| Retry Attempts | 1-3 | 3 |
| Timeout | ms | 300,000 (5 min) |
| Supported Types | MIME types | Image, Video, Audio, PDF, Text |

---

## 🐛 Troubleshooting

**Issue:** "Failed to upload to IPFS"

**Solutions:**
1. Verify Pinata credentials: `node -e "require('./services/ipfsService').verifyCredentials()"`
2. Check file size (max 100MB)
3. Check network connectivity
4. Check Pinata status at https://status.pinata.cloud/

**Issue:** Progress not showing

**Solutions:**
1. Check browser console (F12)
2. Try in incognito mode
3. Update browser

---

## 📖 Documentation

**Complete Docs:** [IPFS_INTEGRATION.md](./IPFS_INTEGRATION.md)

**Sections:**
- Setup instructions
- API reference
- Security guidelines
- Performance optimization
- Deployment guide

---

## ✅ Features

✅ Real-time progress tracking  
✅ Automatic retry (3 attempts)  
✅ File validation  
✅ Drag-and-drop interface  
✅ Image preview  
✅ Token gating support  
✅ Blockchain integration  
✅ Responsive design  
✅ Error handling  
✅ Comprehensive docs  

---

## 🔗 Integration Points

- **Blockchain:** Stacks smart contracts for pricing
- **Database:** MongoDB for metadata
- **Storage:** IPFS via Pinata
- **Wallets:** Hiro Wallet, Xverse

---

## 📞 Support

For detailed help, see [IPFS_INTEGRATION.md](./IPFS_INTEGRATION.md)

**Need help?**
- Check Troubleshooting section
- Review API Reference
- Check Examples section
- Read Pinata docs: https://docs.pinata.cloud/

---

## 🎓 Next Steps

1. ✅ Set up environment variables
2. ✅ Install dependencies
3. ✅ Start backend & frontend
4. ✅ Test upload feature
5. ✅ Deploy to production

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** February 9, 2026
