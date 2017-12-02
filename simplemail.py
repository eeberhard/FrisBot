import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

#mail dict = {'to', 'subject', 'text, 'html'}, cred dict = {'email', 'password', 'server', 'port'}
def sendMail(mail, cred):
	
	FROM = cred['email']
	
	TO = mail['to']
	
	SUBJECT = mail['subject']
	
	TEXT = mail['text']
	
	HTML = mail['html']
	
	
	# Prepare actual message
	msg = MIMEMultipart('alternative')
	msg['Subject'] = SUBJECT
	msg['From'] = FROM
	msg['To'] = ', '.join(TO)
	
	#construct message with plain text and html parts - mail client will choose appropriate version
	msg.attach(MIMEText(TEXT,'plain'))
	msg.attach(MIMEText(HTML,'html'))
	
	
	#connect to smtp server
	s = smtplib.SMTP(cred['server'],cred['port'])
	s.starttls()
	s.login(FROM, cred['password'])
	
	# Send the mail
	s.sendmail(FROM, TO, msg.as_string())
	s.quit()
