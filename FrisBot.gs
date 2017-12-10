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
	Logger.log("Processing unread email with subject: " + message.getSubject())
	console.info("Processing unread email with subject: " + message.getSubject())
	
	if(subject.indexOf('relay: ') != -1) {
		relayMessage(message)
		message.markRead()
		return 0
	}
	
	
	sender = message.getFrom()
	if(sender == null) {
		message.markRead()
		return 0
	}

	
	email = sender.match(/[^<]+(?=>)/g)
	
	if(email == null)
		email = sender
	else
		email = email[0]

  
	Logger.log("Email received from address: " + email)
	console.info("Email received from address: " + email)
		
	//get frisbee group
	group = ContactsApp.getContactGroup('Subscribers')
	contact = ContactsApp.getContact(email)

	//create contact
	if(contact == null) {
		last = sender.match(/[^"]+(?=,)/g)
		first = sender.match(/[^ ]+(?=")/g)
		if((first!=null) && (last!=null)) {
			contact = ContactsApp.createContact(first[0], last[0], email)
			Logger.log("New contact: " + first[0] + " " + last[0] + " (" + email + ")")
			console.info("New contact: " + first[0] + " " + last[0] + " (" + email + ")")
			
		}
		else {
			contact = ContactsApp.createContact(null, null, email)
			Logger.log("New contact: " + email)
			console.info("New contact: " + email)
		}
	}
	else {
		Logger.log("Existing contact found: " + contact.getFullName() + ", " + contact.getEmails()[0].getAddress())
		console.info("Existing contact found: " + contact.getFullName() + ", " + contact.getEmails()[0].getAddress())
	}
	
	
	if(subject.indexOf('unsubscribe') != -1) {
		contact.removeFromGroup(group)
		message.reply("You have been removed from the FrisBot mailing list. To re-subscribe at any time, send me an email with " +
					  "\"subscribe\" in the subject line.\n\nFrisBot")
		Logger.log("Removed " + contact.getFullName() + " (" + email + ") from the Subscribers list")
		console.info("Removed " + contact.getFullName() + " (" + email + ") from the Subscribers list")
	}
	else if(subject.indexOf('subscribe') != -1) {
		contact.addToGroup(group)
		message.reply("Thank you! You have been added to the FrisBot mailing list. To unsubscribe at any time, send me an email with " +
					  "\"unsubscribe\" in the subject line.\n\nFrisBot")
		Logger.log("Added " + contact.getFullName() + " (" + email + ") to the Subscribers list")
		console.info("Added " + contact.getFullName() + " (" + email + ") to the Subscribers list")
	}
	
	
	message.markRead()
	
}


function relayMessage(message) {
	
	subject = message.getSubject().match(/[^<]+(?=>)/g)[0]
	
	group = ContactsApp.getContactGroup('Subscribers')
	
	contacts = group.getContacts()
	emails = []
	
	for(c=0;c<contacts.length;c++) {
		c_emails = contacts[c].getEmails()
		for(e=0;e<c_emails.length;e++) {
			emails.push(c_emails[e].getAddress())
		}
	}
	
	
	recipients = emails.join(", ")
	
	Logger.log("Relaying email to group: " + recipients)
	
	mail = {
		recipients: recipients,
		subject: subject,
		text: message.getPlainBody(),
		html: message.getBody()
	};
	
	console.log({message: 'Relaying email to group', mailData: mail});
	
	GmailApp.sendEmail(recipients, subject, message.getPlainBody(), {
		htmlBody: message.getBody(),
		name: 'FrisBot'
	});
	
}
	
