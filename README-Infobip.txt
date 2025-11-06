# Env config
# General
UI_ORIGIN=http://localhost:3000
SMS_ENABLED=true
SMS_PROVIDER=infobip  # or 'mock' for demo

# Infobip
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_API_KEY=AppKeyFromPortal   # from portal.infobip.com
INFOBIP_SENDER=ServiceSMS          # sender name or number

# Behavior
# - SMS is sent ONLY when submissionType='Complaint' AND SMS_ENABLED=true AND phone + smsNotifications are provided.
