import jwt
import secrets
from datetime import datetime, timedelta
from typing import Optional
import requests
from azure_config import AzureConfig

class AzureAuthService:
    def __init__(self):
        self.config = AzureConfig()
        self.jwt_secret = os.getenv('JWT_SECRET', secrets.token_hex(32))
    
    async def validate_azure_user(self, email: str) -> Optional[dict]:
        """Valida si el usuario existe en Azure AD"""
        try:
            # Obtener token para Graph API
            token_response = self.config.app.acquire_token_for_client(
                scopes=self.config.scope
            )
            
            if "access_token" not in token_response:
                return None
            
            # Consultar usuario en Graph API
            headers = {
                'Authorization': f'Bearer {token_response["access_token"]}',
                'Content-Type': 'application/json'
            }
            
            graph_url = f"https://graph.microsoft.com/v1.0/users/{email}"
            response = requests.get(graph_url, headers=headers)
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    'id': user_data.get('id'),
                    'email': user_data.get('mail') or user_data.get('userPrincipalName'),
                    'name': user_data.get('displayName'),
                    'department': user_data.get('department'),
                    'jobTitle': user_data.get('jobTitle')
                }
            return None
            
        except Exception as e:
            print(f"Error validating Azure user: {e}")
            return None
    
    def generate_download_token(self, user_data: dict, file_id: str) -> str:
        """Genera token JWT para descarga"""
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'name': user_data['name'],
            'file_id': file_id,
            'purpose': 'download',
            'exp': datetime.utcnow() + timedelta(hours=2),  # Expira en 2 horas
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def validate_download_token(self, token: str) -> Optional[dict]:
        """Valida token de descarga"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            if payload.get('purpose') != 'download':
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None