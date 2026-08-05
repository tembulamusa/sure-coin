import CryptoJS from "crypto-js";

/**
 * Decrypt SureCoin REST responses (AES-GCM, IV prepended — matches backend ResponseEncryptionService).
 */
export const decryptSurecoinResponse = (encryptedData, encryptionKey) => {
  if (!encryptedData || !encryptionKey) return null;

  try {
    const keyBytes = encryptionKey.padEnd(16, "0").substring(0, 16);
    const key = CryptoJS.enc.Utf8.parse(keyBytes);
    const raw = CryptoJS.enc.Base64.parse(encryptedData);
    const words = raw.words;
    const sigBytes = raw.sigBytes;

    if (sigBytes <= 12) return null;

    const ivWords = words.slice(0, 3);
    const iv = CryptoJS.lib.WordArray.create(ivWords, 12);
    const ciphertextWords = words.slice(3);
    const ciphertext = CryptoJS.lib.WordArray.create(
      ciphertextWords,
      sigBytes - 12
    );

    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, {
      iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding,
    });

    const decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
    return decryptedData ? JSON.parse(decryptedData) : null;
  } catch {
    try {
      const adjustedKey = encryptionKey.padEnd(16, "0").substring(0, 16);
      const key = CryptoJS.enc.Utf8.parse(adjustedKey);
      const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
      const decryptedBytes = CryptoJS.AES.decrypt(
        { ciphertext: encryptedBytes },
        key,
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
      return decryptedData ? JSON.parse(decryptedData) : null;
    } catch {
      return null;
    }
  }
};

export default decryptSurecoinResponse;
