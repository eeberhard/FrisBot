/**************** TRIGGERED FUNCTIONS ****************/

/* doGet()
*
*  on visiting URL, redirect to most recent poll
*  if the parameter ?show=results is passed, redirect to poll response summary
*
*  full URL:
*    https://script.google.com/macros/s/AKfycbyJDbS9LDmq8H8QErJhH2sSLkMxh0xEB-DQZxNXuhqP3IFxTQA/exec
*  shortcut URL:
*    bit.do/frisbotpoll
*/
function doGet(e) {
  
  var scriptProperties = PropertiesService.getScriptProperties()
  var link;
  
  //task: redirect to results page if a query is given
  if(e.parameter.show == 'results') {
    link = scriptProperties.getProperty('poll_results');
  }
  else if(e.parameter.show == 'fbauth') {
    return fbAuth();
  }
  else {
    link = scriptProperties.getProperty('poll_view');
  }
  
  Logger.log("Redirecting to " + link);
  
  html =  "<script>window.open('" + link + "','_top');</script>"
  //html = "<html><head></head><body><p>FrisBot 2.0 is under construction - this link will work again soon</p></body></html>"
  
  return HtmlService.createHtmlOutput(html);
}




//version of createPoll with repeated attempts if weather API / poll creation fails
function weeklyCreatePoll() {
  
  executeWithTries(createPoll, 'createPoll', 3, 'weeklyCreatePoll');
  
  
  //create new trigger for next week, 9:30  
  var nextTime = new Date();
  nextTime.setDate(nextTime.getDate() + 7); 
  nextTime.setHours(9);
  nextTime.setMinutes(30);
  ScriptApp.newTrigger('weeklyCreatePoll').timeBased().at(nextTime).create();
  
  console.info("Poll created, poll mail sent, and trigger set for next week.");
  
}


function weeklyConfirmPoll() {
  
  executeWithTries(sendConfMail, 'sendConfMail', 3, 'weeklyConfirmPoll');
  
  //create new trigger for next week, 11:00
  var nextTime = new Date();
  nextTime.setDate(nextTime.getDate() + 7); 
  nextTime.setHours(11);
  nextTime.setMinutes(0);
  ScriptApp.newTrigger('weeklyConfirmPoll').timeBased().at(nextTime).create();
  
  
  console.info("Confirmation mail sent, and trigger set for next week");
  
}


/**************** HANDLING FUNCTIONS ****************/


function createPoll(debug) {
  
  console.info("Creating new poll");
  
  var summary = outdoorLogic(getWeather(), 'Friday');
  
  var title = "Frisbee Friday " + summary.weather.simpleday.date.day + 
          " " + summary.weather.simpleday.date.monthname;
  
  var poll = makeNewPoll(title, summary)
  
  poll = openPoll(title)
  
  Logger.log(title)
  Logger.log(poll)
  
  sendPollMail(poll, summary);
}



function sendPollMail(poll, summary) {
  
  var subject = poll.getTitle();
  var src_link = "https://script.google.com/d/1NwqX1-lQbl566AKRK-s34hTAxoVjHvUEwasuP6Aauv9k_WPqq-HZ2BaH/edit?usp=sharing";
  //var src_link = "https://github.com/eeberhard/FrisBot"
  
  var joke = randomDadJoke();
  //var comic = randomXKCD();
  //var comic = specificXKCD(1998);
  var comic = newestXKCD();
  
  var text = "Hello Frisbee Fan, \n\nThis is another automated message to " + 
             "organize a game for Friday afternoon. But first, a joke:\n\n" +
             joke + "\n\n" +
             poll.getDescription() + "\n\n" +
             "Vote for a time here:\n" + poll.getPublishedUrl() + 
             "\nUSER_MESSAGE" +
             "\nFrisBot"  
             
  var html ="<html>" +
            "<head></head>" +
            "<body>" +
            "<p>Hello Frisbee Fan, </p>" +
            "<p>This is another automated message to " + 
            "organize a game for Friday afternoon. The weather report right after today's xkcd comic: </p>" + 
            "<p><img src=\"" + comic.image + "\" alt=\"" + comic.number + "\"></p>" +
            "<p>" + poll.getDescription() + "</p>" +
            "<p><img src=\"" + summary.icon.url + "\" alt=\"" + summary.icon.text + "\"></p>" +
            "<p><b><font size=\"+2\"><a href=\"" + poll.getPublishedUrl() + "\">Vote for a time!</a></font></b></p>" +
            "USER_MESSAGE" +
            "<p>FrisBot</p>" +
            "<br><br>" +
            "<p><i><font size=\"1\">" +
            "Poll and email generated automatically with JavaScript " +
            "(<a href=\"" + src_link + "\">source code</a>). <br>" +
            "FrisBot mail is routed through eeberhard@rvc.ac.uk to avoid the RVC quarantine. <br>" +
            "Please reports bugs or feature requests to eeberhard@rvc.ac.uk <br>" +
            "<a href=\"mailto:smlfrisbot@gmail.com?subject=subscribe&body=Send this to subscribe\">" +
            "Click here to subscribe to these updates</a><br>" +
            "<a href=\"mailto:smlfrisbot@gmail.com?subject=unsubscribe&body=Send this to unsubscribe\">" +
            "Click here to unsubscribe from these updates</a>" +
            "</font></i></p>" +
            "<br><br><br><br></body>" +
            "</html>";
  
  
  sendMailToSubscribers(subject, text, html);
}



function sendConfMail() {
  
  //get more up-to-date weather
  var summary = outdoorLogic(getWeather(), 'Friday');
  
  var src_link = "https://script.google.com/d/1NwqX1-lQbl566AKRK-s34hTAxoVjHvUEwasuP6Aauv9k_WPqq-HZ2BaH/edit?usp=sharing";
  //var src_link = "https://github.com/eeberhard/FrisBot"
  
  var poll = openPoll();
  
  var results = checkResults(poll.getTitle());
  
  var result_text, result_html;
  
  if(results.votes >= 6) {
    
    result_text = "There were enough responses for a full game, with " +
      results.votes + " votes for " + results.time + "!";
    
    result_text = result_text + " Attending players include " +
      results.names.slice(0,results.names.length-1).join(', ') + " and " + results.names[results.names.length-1] + "."
    
    result_html = "<p>" + result_text + " (<a href=\"" + poll.getSummaryUrl() + "\">view responses</a>)</p>"
    
    
    result_text += "\n\nThe updated forecast for today is: " + summary.text;
    
    result_html += "<p>The updated forecast for today is: " + summary.text + " </p>" +
                   "<p><img src=\"" + summary.icon.url + "\" alt=\"" + summary.icon.text + "\"></p>";
    
    
    if(summary.outside) {
      result_text += "\n\nMeet out on the sports field at " + results.time.slice(0,5) + "!";
      result_html += "<p><b><font size=\"+1\">Meet on the sports field at " + results.time.slice(0,5) + "!</font></b></p>"
    }
    else {
      var start = results.time.slice(0,5);
      if (parseInt(start) == 14 || parseInt(start) == 15) {
        result_text += "\n\nMeet in the sports hall at " + results.time.slice(0,5) + "!";
        result_html += "<p><b>Meet in the sports hall at " + results.time.slice(0,5) + "!</b>"
      }
      else {
        result_text += "\n\nThe weather may be unsuitable outside, but the voted time is not within the regular Sports Halls slot (13:00-15:00).\n" +
                       "This requires a human to step outside and confirm the weather/sports hall availability. Stay tuned."
        
        result_html += "<p>The weather may be unsuitable outside, but the voted time is not within the regular Sports Halls slot (13:00-15:00).<br>" +
                       "This requires a human to step outside and confirm the weather/sports hall availability. Stay tuned. </p>"
      }
    }
    
  }
  else {
    var plural = 's'
    if(results.votes == 1)
      plural = '';
    
    result_text = "Unfortunately there were not enough responses for a full game, with " +
      results.votes + " vote" + plural + " for " + results.time + ".";
    
    result_html = "<p>" + result_text + " (<a href=\"" + poll.getSummaryUrl() + "\">view responses</a>)</p>"
  }
    
  
  
  
  var subject = "Update: " + poll.getTitle();
  
  var joke = randomDadJoke();
  
  var text = "Hello Frisbee Fan, \n\n" + 
             joke + "\n\n"
             result_text + "\n\n" +
             "USER_MESSAGE\n" +
             "FrisBot"  
             
  var html ="<html>" +
            "<head></head>" +
            "<body>" +
            "<p>Hello Frisbee Fan, </p>" + 
            "<p>" + joke + "</p>" + 
            result_html +  
            "USER_MESSAGE" +
            "<p>FrisBot</p>" +
            "<br><br>" +
            "<p><i><font size=\"1\">" +
            "Poll and email generated automatically with JavaScript " +
            "(<a href=\"" + src_link + "\">source code</a>). <br>" +
            "FrisBot mail is routed through eeberhard@rvc.ac.uk to avoid the RVC quarantine. <br>" +
            "Please reports bugs or feature requests to eeberhard@rvc.ac.uk <br>" +
            "<a href=\"mailto:smlfrisbot@gmail.com?subject=subscribe&body=Send this to subscribe\">" +
            "Click here to subscribe to these updates</a><br>" +
            "<a href=\"mailto:smlfrisbot@gmail.com?subject=unsubscribe&body=Send this to unsubscribe\">" +
            "Click here to unsubscribe from these updates</a>" +
            "</font></i></p>" +
            "<br><br><br><br></body>" +
            "</html>";
  
  sendMailToSubscribers(subject, text, html);
    
}



function testweather() {
  var summary = outdoorLogic(getWeather(), 'Friday');
  Logger.log(summary);
}


//work in progress to check an API if Friday is a bank holiday (really only applies at Easter)
// also add some days around Christmas/New Years to prevent mails on those dates.
function isHoliday() {
  
  //holidayapi returns holidays for many countries, but only past holidays for free accounts
  //var url = "https://holidayapi.com/v1/holidays?key=528447bf-0cd8-4eef-aeef-c3a0b9d8c4f4&country=GB"
  
  //uk gov returns all holidays of last 6 years and upcoming 6 months
  var url = "https://www.gov.uk/bank-holidays.json"
  
  
  var json = "";
  var debug = false;
  
  var response = UrlFetchApp.fetch(url);
  json = response.getContentText();
  
  
  var holidays = JSON.parse(json)
  
  Logger.log(holidays['england-and-wales'].events)
  
}



/**************** GRACEFULLY RETRY FUNCTIONS ****************/

function executeWithTries(functionHandle, functionName, maxTries, callingName) {
  var scriptProperties = PropertiesService.getScriptProperties()
  var tries = parseInt(scriptProperties.getProperty('execution_tries')); 
  
  if (tries == null || tries == 0) {
    tries = 1;
  }
  
  console.info("Executing function " + functionName + " (attempt " + tries + ")");
  
  
  try {
    
    functionHandle();
    
  } catch(err) {
    
    if (tries < maxTries) {
      //something went wrong - before aborting,
      //trigger this function to try again in 5 minutes
      var retry = new Date();
      retry.setTime(retry.getTime + 1*60000);
      ScriptApp.newTrigger(callingName).timeBased().at(retry).create();
      
      scriptProperties.setProperty('execution_tries', tries + 1);
    }
    else { //if it tried and failed 3 times, stop trying and notify dev
      
      GmailApp.sendEmail('enrico.eberhard@gmail.com',
                         "FrisBot execution error",
                         "Function " + functionName + " failed after " + tries +
                         " tries, with error: " + err)
                         
      scriptProperties.setProperty('execution_tries', 0);
      
      console.info("Max tries reached for function " + functionName + " (attempt " + tries + ")");
    }
    
    throw err;
  }
  
  console.info("Successfully executed function " + functionName + " (attempt " + tries + ")");
  
  scriptProperties.setProperty('execution_tries', 0);
  
}