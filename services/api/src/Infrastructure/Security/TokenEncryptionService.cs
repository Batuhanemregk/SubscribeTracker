using System.Security.Cryptography;
using System.Text;

namespace SubscribeTracker.Api.Infrastructure.Security;

/// <summary>
/// AES-256-GCM encryption for OAuth tokens at rest.
/// Supports key versioning for rotation.
/// </summary>
public interface ITokenEncryptionService
{
    byte[] Encrypt(string plaintext);
    string Decrypt(byte[] ciphertext);
}

public class TokenEncryptionService : ITokenEncryptionService
{
    private readonly byte[] _key;
    private const int NonceSize = 12;
    private const int TagSize = 16;

    public TokenEncryptionService(string base64Key)
    {
        _key = Convert.FromBase64String(base64Key);
        if (_key.Length != 32)
            throw new ArgumentException("Encryption key must be 32 bytes (256 bits)");
    }

    public byte[] Encrypt(string plaintext)
    {
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);

        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);

        // Return: nonce (12) + tag (16) + ciphertext
        var result = new byte[NonceSize + TagSize + ciphertext.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, result, NonceSize, TagSize);
        Buffer.BlockCopy(ciphertext, 0, result, NonceSize + TagSize, ciphertext.Length);

        return result;
    }

    public string Decrypt(byte[] encryptedData)
    {
        if (encryptedData.Length < NonceSize + TagSize)
            throw new ArgumentException("Invalid encrypted data");

        var nonce = new byte[NonceSize];
        var tag = new byte[TagSize];
        var ciphertext = new byte[encryptedData.Length - NonceSize - TagSize];

        Buffer.BlockCopy(encryptedData, 0, nonce, 0, NonceSize);
        Buffer.BlockCopy(encryptedData, NonceSize, tag, 0, TagSize);
        Buffer.BlockCopy(encryptedData, NonceSize + TagSize, ciphertext, 0, ciphertext.Length);

        var plaintext = new byte[ciphertext.Length];

        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, ciphertext, tag, plaintext);

        return Encoding.UTF8.GetString(plaintext);
    }
}
