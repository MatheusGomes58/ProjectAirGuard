from stegano import lsb
import io
from PIL import Image

def stego_encode(image_bytes: bytes, secret_message: str) -> bytes:
    """
    Hides secret_message inside image_bytes. Uses LSB.
    Note: Output format is naturally PNG because PNG supports lossless compression,
    which is necessary for LSB.
    """
    image_stream = io.BytesIO(image_bytes)
    # LSB requires RGB or RGBA, image should be converted to RGB if it isn't
    # stegano handles it, but we can verify.
    secret = lsb.hide(image_stream, secret_message)
    
    output_stream = io.BytesIO()
    secret.save(output_stream, format="PNG")
    return output_stream.getvalue()

def stego_decode(image_bytes: bytes) -> str:
    """
    Reveals the secret_message hidden inside image_bytes.
    """
    image_stream = io.BytesIO(image_bytes)
    secret_message = lsb.reveal(image_stream)
    if secret_message is None:
        return ""
    return secret_message
