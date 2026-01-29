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

module.exports = {
  uploadToIPFS,
  getGatewayUrl,
};
