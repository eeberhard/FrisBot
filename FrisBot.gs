function main() {
	var threads = GmailApp.getInboxThreads(0,50);
	for (var i=0; i < threads.length; i++) {
		var messages = threads[i].getMessages();
		
		for (var j=0; j < messages.length; j++) {
			if (messages[j].isUnread()) {
				processMessage(messages[j])
			}
		}
	}
}


function processMessage(message) {
	
	subject = message.getSubject().toLowerCase()
	Logger.log(subject)

	if(subject.indexOf('relay: ') != -1) {
		relayMessage(message)
	}


	sender = message.getFrom()
	email = sender.match(/[^<]+(?=>)/g)[0]

	if(email == null)
		email = sender

	Logger.log(sender)
	Logger.log(email)

	//get frisbee group
	group = ContactsApp.getContactGroup('Frisbee')
	contact = ContactsApp.getContact(email)

	//create contact
	if(contact == null) {
		last = sender.match(/[^"]+(?=,)/g)[0]
		first = sender.match(/[^ ]+(?=")/g)[0]
		Logger.log(first)
		Logger.log(last)
		contact = ContactsApp.createContact(first, last, email)
	}
	
	Logger.log(contact)
	
	if(subject.indexOf('unsubscribe') != -1) {
		contact.removeFromGroup(group)
		message.reply("You have been removed from the FrisBot mailing list. To re-subscribe at any time, send me an email with " +
					  "\"subscribe\" in the subject line.\n\nFrisBot")
	}
	else if(subject.indexOf('subscribe') != -1) {
		contact.addToGroup(group)
		message.reply("Thank you! You have been added to the FrisBot mailing list. To unsubscribe at any time, send me an email with " +
					  "\"unsubscribe\" in the subject line.\n\nFrisBot")
	}
	
	
	message.markRead()

}


function relayMessage(message) {
	
	group = ContactsApp.getContactGroup('Frisbee')
	
	contacts = group.getContacts()
	emails = []
	
	for(c=0;c<contacts.length;c++) {
		c_emails = contacts[c].getEmails()
		for(e=0;e<c_emails.length;e++) {
			emails.push(c_emails[e].getAddress())
		}
	}
	
	Logger.log(emails)
	
	recipients = emails.join(", ")
	Logger.log(recipients)
	
	GmailApp.sendEmail('eeberhard@rvc.ac.uk', message.getSubject(), message.getPlainBody(), {
	htmlBody: message.getBody(),
	name: 'FrisBot'
	});
	
}
