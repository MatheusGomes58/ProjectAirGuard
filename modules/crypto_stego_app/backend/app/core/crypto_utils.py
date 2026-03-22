import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding, hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.primitives import serialization

# --- Symmetric Cryptography (AES-256-CBC) ---

# Generate key (for simplicity, we will use a static key or random for demo, but better to allow user to provide one)
# We'll generate a random 32-byte key for encryption
def sym_encrypt(data: bytes, key: bytes = None) -> tuple[bytes, bytes]:
    if key is None:
        key = os.urandom(32) # AES-256
    iv = os.urandom(16)
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(data) + padder.finalize()
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded_data) + encryptor.finalize()
    
    # We return iv + ct so it can be decrypted easily, or return key as well if needed.
    return key, iv + ct

def sym_decrypt(ct_with_iv: bytes, key: bytes) -> bytes:
    iv = ct_with_iv[:16]
    ct = ct_with_iv[16:]
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(ct) + decryptor.finalize()
    
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()
    return data

# --- Asymmetric Cryptography (RSA) ---

def generate_rsa_keys():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    
    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    pem_public = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem_private, pem_public

def asym_encrypt(data: bytes, public_key_pem: bytes) -> bytes:
    public_key = serialization.load_pem_public_key(
        public_key_pem,
        backend=default_backend()
    )
    
    # RSA can only encrypt small amounts of data. 
    # For large files, hybrid encryption is used (encrypt file with AES, encrypt AES key with RSA).
    # Since the prompt asks for files up to 500MB, we MUST use hybrid encryption here.
    
    aes_key = os.urandom(32)
    iv = os.urandom(16)
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(data) + padder.finalize()
    
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded_data) + encryptor.finalize()
    
    encrypted_aes_key = public_key.encrypt(
        aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # Bundle: encrypted_aes_key (256 bytes for 2048-bit RSA) + IV (16 bytes) + ciphertext
    return encrypted_aes_key + iv + ct

def asym_decrypt(encrypted_data: bytes, private_key_pem: bytes) -> bytes:
    private_key = serialization.load_pem_private_key(
        private_key_pem,
        password=None,
        backend=default_backend()
    )
    
    # Extract bundle
    # For 2048-bit RSA, the encrypted key is 256 bytes
    key_size = private_key.key_size // 8
    encrypted_aes_key = encrypted_data[:key_size]
    iv = encrypted_data[key_size:key_size+16]
    ct = encrypted_data[key_size+16:]
    
    aes_key = private_key.decrypt(
        encrypted_aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(ct) + decryptor.finalize()
    
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()
    return data
