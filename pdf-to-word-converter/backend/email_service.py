import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from azure_config import AzureConfig

class EmailService:
    def __init__(self):
        self.config = AzureConfig()
    
    async def send_download_token(self, user_email: str, user_name: str, token: str, filename: str):
        """Envía token de descarga por correo usando Graph API"""
        try:
            # Obtener token para Graph API
            token_response = self.config.app.acquire_token_for_client(
                scopes=self.config.scope
            )
            
            if "access_token" not in token_response:
                raise Exception("No se pudo obtener token de Graph API")
            
            # Crear mensaje de correo
            download_url = f"https://tu-frontend.vercel.app/download?token={token}"
            
            email_body = f"""
            <html>
            <body>
                <h2>Documento PDF convertido exitosamente</h2>
                <p>Hola {user_name},</p>
                <p>Tu documento <strong>{filename}</strong> ha sido convertido a Word exitosamente.</p>
                <p>Para descargar tu archivo, haz click en el siguiente enlace:</p>
                <p><a href="{download_url}" style="background-color: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Descargar Documento</a></p>
                <p><strong>Importante:</strong> Este enlace expira en 2 horas por seguridad.</p>
                <p>Si no solicitaste esta conversión, por favor contacta al administrador.</p>
                <hr>
                <p><small>Este correo fue enviado automáticamente por el sistema de conversión PDF to Word.<br>
                © 2024 César Loreth - Todos los derechos reservados.</small></p>
            </body>
            </html>
            """
            
            # Enviar correo usando Graph API
            headers = {
                'Authorization': f'Bearer {token_response["access_token"]}',
                'Content-Type': 'application/json'
            }
            
            email_data = {
                "message": {
                    "subject": f"Documento convertido: {filename}",
                    "body": {
                        "contentType": "HTML",
                        "content": email_body
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": user_email,
                                "name": user_name
                            }
                        }
                    ]
                },
                "saveToSentItems": False
            }
            
            # Enviar desde cuenta de servicio o usuario autorizado
            graph_url = "https://graph.microsoft.com/v1.0/users/sistema@tuempresa.com/sendMail"
            response = requests.post(graph_url, headers=headers, json=email_data)
            
            if response.status_code == 202:
                return True
            else:
                print(f"Error enviando correo: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Error en servicio de correo: {e}")
            return False