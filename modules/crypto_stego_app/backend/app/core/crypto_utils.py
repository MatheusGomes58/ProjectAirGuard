import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding, hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.primitives import serialization

CHUNK_SIZE = 64 * 1024

# --- Symmetric Cryptography (AES-256-CBC) ---

def sym_encrypt(data: bytes, key: bytes = None) -> tuple[bytes, bytes]:
    if key is None:
        key = os.urandom(32) # AES-256
    iv = os.urandom(16)
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(data) + padder.finalize()
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded_data) + encryptor.finalize()
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

def sym_encrypt_stream(in_file, out_file, key: bytes = None) -> bytes:
    if key is None:
        key = os.urandom(32)
    iv = os.urandom(16)
    out_file.write(key)
    out_file.write(iv)
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    
    while True:
        chunk = in_file.read(CHUNK_SIZE)
        if not chunk:
            break
        padded_chunk = padder.update(chunk)
        if padded_chunk:
            out_file.write(encryptor.update(padded_chunk))
            
    padded_chunk = padder.finalize()
    if padded_chunk:
        out_file.write(encryptor.update(padded_chunk))
    out_file.write(encryptor.finalize())
    return key

def sym_decrypt_stream(in_file, out_file, key: bytes):
    iv = in_file.read(16)
    if len(iv) < 16:
        raise ValueError("Invalid file format")
        
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    unpadder = padding.PKCS7(128).unpadder()
    
    while True:
        chunk = in_file.read(CHUNK_SIZE)
        if not chunk:
            break
        decrypted_chunk = decryptor.update(chunk)
        if decrypted_chunk:
            unpadded_chunk = unpadder.update(decrypted_chunk)
            if unpadded_chunk:
                out_file.write(unpadded_chunk)
                
    decrypted_chunk = decryptor.finalize()
    if decrypted_chunk:
        unpadded_chunk = unpadder.update(decrypted_chunk)
        if unpadded_chunk:
            out_file.write(unpadded_chunk)
            
    out_file.write(unpadder.finalize())

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
    return encrypted_aes_key + iv + ct

def asym_decrypt(encrypted_data: bytes, private_key_pem: bytes) -> bytes:
    private_key = serialization.load_pem_private_key(
        private_key_pem,
        password=None,
        backend=default_backend()
    )
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

def asym_encrypt_stream(in_file, out_file, public_key_pem: bytes):
    public_key = serialization.load_pem_public_key(public_key_pem, backend=default_backend())
    aes_key = os.urandom(32)
    iv = os.urandom(16)
    
    encrypted_aes_key = public_key.encrypt(
        aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    out_file.write(encrypted_aes_key)
    out_file.write(iv)
    
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    
    while True:
        chunk = in_file.read(CHUNK_SIZE)
        if not chunk:
            break
        padded_chunk = padder.update(chunk)
        if padded_chunk:
            out_file.write(encryptor.update(padded_chunk))
            
    padded_chunk = padder.finalize()
    if padded_chunk:
        out_file.write(encryptor.update(padded_chunk))
    out_file.write(encryptor.finalize())

def asym_decrypt_stream(in_file, out_file, private_key_pem: bytes):
    private_key = serialization.load_pem_private_key(private_key_pem, password=None, backend=default_backend())
    key_size = private_key.key_size // 8
    
    encrypted_aes_key = in_file.read(key_size)
    if len(encrypted_aes_key) < key_size:
        raise ValueError("Invalid file format or truncated file")
        
    iv = in_file.read(16)
    if len(iv) < 16:
        raise ValueError("Invalid file format or truncated file")
        
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
    unpadder = padding.PKCS7(128).unpadder()
    
    while True:
        chunk = in_file.read(CHUNK_SIZE)
        if not chunk:
            break
        decrypted_chunk = decryptor.update(chunk)
        if decrypted_chunk:
            unpadded_chunk = unpadder.update(decrypted_chunk)
            if unpadded_chunk:
                out_file.write(unpadded_chunk)
                
    decrypted_chunk = decryptor.finalize()
    if decrypted_chunk:
        unpadded_chunk = unpadder.update(decrypted_chunk)
        if unpadded_chunk:
            out_file.write(unpadded_chunk)
            
    out_file.write(unpadder.finalize())

