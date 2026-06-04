from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from exponent_server_sdk import PushClient, PushMessage, PushServerError

User = get_user_model()

class Command(BaseCommand):
    help = 'Sends a test push notification to a specific user email'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help="The email of the user to send the push to")

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = User.objects.get(email=email)
            token = user.profile.expo_push_token
            
            if not token:
                self.stdout.write(self.style.ERROR(f'User {email} has no Expo push token saved. Make sure you logged into the mobile app on a physical device!'))
                return
                
            self.stdout.write(self.style.NOTICE(f'Sending push to {email} (Token: {token})...'))
            
            response = PushClient().publish(
                PushMessage(
                    to=token,
                    title="Test Notification \U0001F680",
                    body="If you tap this, it should open the tracking screen!",
                    data={"url": "inutriguide://tabs/tracking"},
                )
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully sent! Expo Response: {response}'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {email} does not exist.'))
        except PushServerError as exc:
            self.stdout.write(self.style.ERROR(f'Expo Push Server Error: {exc.errors} \nResponse data: {exc.response_data}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
