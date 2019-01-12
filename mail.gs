/**************** TRIGGERED FUNCTIONS ****************/


/* check_messages()
*
*  cycle through all unread messages
*  and all labelled messages (in defined time frame)
*/
function check_messages() {
  var threads = GmailApp.getInboxThreads(0,20);
  for (var i=0; i < threads.length; i++) {
    var messages = threads[i].getMessages();

    for (var j=0; j < messages.length; j++) {
      if (messages[j].isUnread()) {
        handle_message(messages[j])
      }
    }
  }
  
  //relay any pending messages
  handle_relays()
}






/**************** HANDLING FUNCTIONS ****************/

/* handle_message(message)
*
*  determines how to process a message based on 
*  its subject
*/
function handle_message(message) {
  subject = message.getSubject().toLowerCase()
  
  Logger.log("Processing unread email with subject: " + message.getSubject())
  console.info("Processing unread email with subject: " + message.getSubject())
  
  //check for subject keywords
  if(subject.indexOf('relay: ') != -1) {
    thread = message.getThread()
    label = GmailApp.getUserLabelByName('RELAY')
    label.addToThread(thread)
    Logger.log("Labelled this message RELAY")
    console.info("Labelled this message RELAY");
  }
  else if(subject.indexOf('user_message') != -1) {
    var text = message.getPlainBody();
  
    //remove everything beyond the key word
    var end = text.indexOf("END_OF_MESSAGE");
    
    if (end != -1)
      text = text.substring(0, end);
    
    scriptProperties = PropertiesService.getScriptProperties()
    scriptProperties.setProperty('user_message', text)
    Logger.log("Updated user_message data: \n" + text)
    console.info("Updated user_message data: \n" + text)
  }
  else if(subject.indexOf('subscribe') != -1) {
    handle_subscriber(message,subject)
  }
  
  message.markRead()
}




/* checkRelayTime()
*
*  check if current time is within a certain
*  time and weekday range
*/
function checkRelayTime() {
  
    var d = new Date(); // current time
    var hours = d.getHours();
    var mins = d.getMinutes();
    var day = d.getDay();

    return (day == 4 && hours >= 10 && hours < 11)  //Thursday 10-11
        || (day == 5 && hours >= 11 && hours < 12) //Friday 11-12
}


/* handle_relays()
*  
*  relays all messages with the RELAY label to Subscribers group
*/
function handle_relays() {
  label = GmailApp.getUserLabelByName('RELAY')
  threads = label.getThreads()
  
  for (var i=0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    Logger.log("Processing labeled relay email with subject: " + messages[0].getSubject())
    relay_message(messages[0])
    label.removeFromThread(threads[i])
  }
}







/**************** MESSAGE FUNCTIONS ****************/


/* handle_subscriber(message, subject)
*
*  adds or removes contacts from Subscribers group
*  based on message subject
*/
function handle_subscriber(message, subject) {
  
  //determine the email sender
  sender = message.getFrom()
  if(sender == null) {
    return 0
  }
    
  email = sender.match(/[^<]+(?=>)/g)
  
  if(email == null)
    email = sender
  else
    email = email[0]
  
  Logger.log("Email received from address: " + email)
  console.info("Email received from address: " + email)
    
  //locate contact from email, or create new contact if none found
  contact = ContactsApp.getContact(email)
  
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
  
  //get frisbee subscriber group
  group = ContactsApp.getContactGroup('Subscribers')
  
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
  
  return 0
}





/* relay_message(message)
*  
*  relays the given message to Subscribers group
*/
function relay_message(message) {
  var subject = message.getSubject().toLowerCase()
  
  //ignore the message if subject doesn't contain "relay: " (to be handled by different timer) 
  if(subject.indexOf('relay: ') == -1) {
    return 0
  }
  
  Logger.log("Processing labeled relay email with subject: " + message.getSubject())
  console.info("Processing labeled relay email with subject: " + message.getSubject())
  

  //extract the actual subject between the < >
  subject = message.getSubject().match(/[^<]+(?=>)/g)
  if(subject == null)
    return 0
  subject = subject[0]
  

  
  var text = message.getPlainBody();
  
  
  //remove everything beyond the key word
  var end = text.indexOf("END_OF_MESSAGE");
  
  if (end != -1) {
    
    text = text.substring(0, end);
    
  }
  else { //if no key-word, try to get rid of disclaimer junk
    
    //remove any RVC disclaimer junk if present
    var RVCJunk = ["[RVC Logo - link to RVC Website]", "of the risks inherent in doing so."];
    
    var inds = [text.indexOf(RVCJunk[0]), text.indexOf(RVCJunk[1])];
    
    if((inds[0] != -1) && (inds[1] != -1)) {
      var Junk = text.substring(inds[0], inds[1] + RVCJunk[1].length);
      text = text.replace(Junk, "");
    }
    
    //remove anything left between [ and ] symbols
    var inds = [text.indexOf('['), text.indexOf(']')];
    
    if((inds[0] != -1) && (inds[1] != -1)) {
      var Junk = text.substring(inds[0], inds[1] + 1);
      text = text.replace(Junk, "");
    }
  }
  
  //replace new lines with line-break
  var html = text;
  while (html.indexOf("\n") != -1)
    html = html.replace("\n", "<br>");
  
  
  //Add a note at the start of mail to say where the relay came from
  var ref = "The following message from " + message.getFrom() + " has been automatically relayed by FrisBot:";
  
  text = ref + "\n\n" + text;
  
  var html =  "<html>" +
          "<head></head>" +
          "<body>" +
          "<p><i>" + ref + "</i></p><br>" + 
          "<p>" + html + "</p>" +
          "</body>" +
          "</html>";
              
  
  
  Logger.log(text);
  Logger.log(html);
  
  sendMailToSubscribers(subject, text, html);

}




function getSubscriberList() {
  
  var group = ContactsApp.getContactGroup('Subscribers')
  
  var contacts = group.getContacts()
  var emails = []
  var names = []
  
  for(c=0;c<contacts.length;c++) {
    c_emails = contacts[c].getEmails()
    for(e=0;e<c_emails.length;e++) {
      names.push(contacts[c].getGivenName());
      emails.push(c_emails[e].getAddress())
    }
  }
  

  var recipients = emails.join(", ");
  
  return recipients;
}


function sendSubscriberList(to) {

  var recipients = getSubscriberList();
  
  var options = {
      from: 'eeberhard@rvc.ac.uk',
      replyTo: 'smlfrisbot@rvc.ac.uk',
      name: 'FrisBot'
    };
  
  GmailApp.sendEmail(to, 'FrisBot Subscribers', recipients, options);
  
}


function sendMailToSubscribers(subject, text, html) {
  var scriptProperties = PropertiesService.getScriptProperties();
  
  //Add a user message to the mail if one exists (and isn't blank)
  var user_message = scriptProperties.getProperty('user_message')
  
  if ((user_message != null)&&(user_message.length > 0)) {
    if(text.indexOf('USER_MESSAGE') != -1) {
      text = text.replace("USER_MESSAGE", "Additional human message: " + user_message + "\n")
      Logger.log("Inserted user message into relay mail: \n" + text)
      scriptProperties.setProperty('user_message','')
    }
    if(html.indexOf('USER_MESSAGE') != -1) {
      html = html.replace('USER_MESSAGE', "<p><font size=\"+1\">Additional human message: <i>" + user_message + "</i></font></p>")
      scriptProperties.setProperty('user_message','')
    }
  }
  else { //if there's no user message, erase any occurence of the keyword
      text = text.replace("USER_MESSAGE", "")
      html = html.replace("USER_MESSAGE", "")
  }
  
  
  var recipients = getSubscriberList();
  //var recipients = 'enrico.eberhard@gmail.com'
  
  
  var options = {
      htmlBody: html,
      bcc: recipients,
      from: 'eeberhard@rvc.ac.uk',
      replyTo: 'smlfrisbot@rvc.ac.uk',
      name: 'FrisBot'
    };
  
  
  Logger.log("Sending email to: " + recipients)
  
  console.log({message: "Sending email to: " + recipients, text: text, mailData: options});
  
  GmailApp.sendEmail('', subject, text, options);
  
}

