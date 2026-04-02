const axios = require('axios');
const crypto = require('crypto');
const config = {
  baseURL: process.env.MYSIGN_API_URL,
  clientId: process.env.MYSIGN_CLIENT_ID,
  clientSecret: process.env.MYSIGN_CLIENT_SECRET,
  profileId: process.env.MYSIGN_PROFILE_ID,
};

class MySignService {
  constructor() {
    this.accessToken = null;
    this.tokenExpires = 0;
  }

  // Lấy access_token (gọi trước khi thực hiện các API khác)
  async login(userId) {
    try {
      const response = await axios.post(`${config.baseURL}/login`, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        profile_id: config.profileId,
        user_id: userId,
      });
      this.accessToken = response.data.access_token;
      this.tokenExpires = Date.now() + (response.data.expires_in - 60) * 1000; // hết hạn sớm 1 phút
      return this.accessToken;
    } catch (error) {
      throw new Error(`MySign login failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Đảm bảo có token hợp lệ
  async ensureToken(userId) {
    if (!this.accessToken || Date.now() >= this.tokenExpires) {
      await this.login(userId);
    }
    return this.accessToken;
  }

  // Lấy danh sách chứng thư số của người dùng
  async getCredentials(userId) {
    const token = await this.ensureToken(userId);
    const response = await axios.post(`${config.baseURL}/credentials/list`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.credentialIDs; // mảng các credential_id
  }

  // Lấy thông tin chi tiết một chứng thư
  async getCredentialInfo(userId, credentialId) {
    const token = await this.ensureToken(userId);
    const response = await axios.post(`${config.baseURL}/credentials/info`, {
      credentialID: credentialId,
      certInfo: true,
      authInfo: true,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // Gửi yêu cầu ký (lấy SAD)
  async authorizeSign(userId, credentialId, documentName, hashBase64) {
    const token = await this.ensureToken(userId);
    const payload = {
      credentialID: credentialId,
      numSignatures: 1,
      documents: [{ document_name: documentName }],
      hash: [hashBase64],
      description: `Ký phiếu khám ${documentName}`,
    };
    const response = await axios.post(`${config.baseURL}/credentials/authorize`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.SAD; // mã SAD dùng để lấy chữ ký
  }

  // Sinh chữ ký từ SAD và hash
  async signHash(userId, credentialId, sad, hashBase64, signAlgo = '1.2.840.113549.1.1.1', hashAlgo = '2.16.840.1.101.3.4.2.1') {
    const token = await this.ensureToken(userId);
    const payload = {
      credentialID: credentialId,
      SAD: sad,
      hash: [hashBase64],
      hashAlgo,
      signAlgo,
      async: 0,
    };
    const response = await axios.post(`${config.baseURL}/signHash`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.signatures[0]; // chữ ký base64
  }

  // Gộp các bước: lấy danh sách chứng thư, chọn cái đầu tiên, tạo SAD, lấy chữ ký
  async signDocument(userId, documentName, contentBuffer) {
    // Tính hash của nội dung (SHA256)
    const hash = crypto.createHash('sha256').update(contentBuffer).digest('base64');
    // Lấy danh sách chứng thư
    const credentialIds = await this.getCredentials(userId);
    if (!credentialIds || credentialIds.length === 0) {
      throw new Error('Không tìm thấy chứng thư số của bác sĩ');
    }
    const credentialId = credentialIds[0]; // dùng chứng thư đầu tiên
    // Gửi yêu cầu ký
    const sad = await this.authorizeSign(userId, credentialId, documentName, hash);
    // Lấy chữ ký
    const signature = await this.signHash(userId, credentialId, sad, hash);
    return { signature, credentialId, sad };
  }
}

module.exports = new MySignService();