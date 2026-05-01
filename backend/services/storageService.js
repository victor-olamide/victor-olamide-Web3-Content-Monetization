const axios = require('axios');
const FormData = require('form-data');

const uploadToIPFS = async (fileBuffer, fileName) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  
  let data = new FormData();
  data.append('file', fileBuffer, {
    filename: fileName
  });

  const response = await axios.post(url, data, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
    },
  });

  return `ipfs://${response.data.IpfsHash}`;
};

const getGatewayUrl = (ipfsUrl) => {
  if (!ipfsUrl) return '';
  const hash = ipfsUrl.replace('ipfs://', '');
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

const checkStorageHealth = async () => {
  try {
    const url = `https://api.pinata.cloud/data/testAuthentication`;
    await axios.get(url, {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
};

const uploadToGaia = async (fileBuffer, fileName) => {
  // Gaia is typically client-side, but we can simulate/implement backend-side Gaia upload
  // For now, we'll mark it as a placeholder for backend-mediated Gaia storage
  console.log(`Uploading ${fileName} to Gaia (Mock)`);
  return `gaia://${process.env.GAIA_HUB_URL || 'hub.blockstack.org'}/${fileName}`;
};

module.exports = {
  uploadToIPFS,
  uploadToGaia,
  getGatewayUrl,
  checkStorageHealth,
};
