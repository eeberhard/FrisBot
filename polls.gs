function makeNewPoll(title, summary) {
  
  console.info("Creating new poll %s", title);
  
  var poll;
  
  if(poll = openPoll(title)) {
    Logger.log('Poll "%s" already exists', title)
    console.info('Poll "%s" already exists', title)
    return poll
  }
 
  
  var description = 'Weather forecast for ' + summary.day + ': ' + summary.text;
  var times = summary.times;
    
  
  poll = FormApp.create(title);
  
  poll.setTitle(title);
  poll.setDescription(description + "\nTo view current responses, go to bit.do/FrisBotStatus")
  
  
  var imageItem = poll.addImageItem();
  
  imageItem.setImage(UrlFetchApp.fetch(summary.icon.url));
  
  
  var nameItem = poll.addTextItem();
  
  nameItem.setTitle('Name')
  nameItem.setRequired(true)
  
  
  var timeItem = poll.addCheckboxItem();
  
  timeItem.setTitle('Friday Availability');
  
  
  var choices = []
  var t
  for(t=0; t < times.length; t++) {
    choices.push(timeItem.createChoice(times[t]))
  }
  
  timeItem.setChoices(choices);
  
  Logger.log('Published URL: ' + poll.getPublishedUrl());
  
  poll.setPublishingSummary(true)
  poll.setShowLinkToRespondAgain(false)
  
  
  poll.setConfirmationMessage('Thank you! Stay tuned for an update email at 11:00 on Friday. ' +
                              'In the meantime, check the current responses using the link below. ' + 
                              'To subscribe to FrisBot updates, email SMLFrisBot@gmail.com with subject \"Subscribe\". ')
  poll.setCustomClosedFormMessage('This poll is closed! Do you have the up-to-date link?')
  

  var scriptProperties = PropertiesService.getScriptProperties()  
  scriptProperties.setProperty('poll_view', poll.getPublishedUrl())
  scriptProperties.setProperty('poll_results', poll.getSummaryUrl())
  scriptProperties.setProperty('poll_edit', poll.getEditUrl())
  
  
  //move poll into the frisbee friday folder
  movePoll(title)
  
  //return the poll
  return poll
  
}




function openPoll(title) {
  
  if (!title) {
    var scriptProperties = PropertiesService.getScriptProperties()
    var link = scriptProperties.getProperty('poll_edit'); 
    if(link)
      return FormApp.openByUrl(link);
  }
  
  //check that a poll with that title doesn't already exist in the 
  //FrisBotPolls folder
  var folders = DriveApp.getFoldersByName('FrisBotPolls')
  if(!folders.hasNext())
    return
  
  var folder = folders.next()
  
  var files = folder.getFilesByName(title);
      
  if(files.hasNext())
    return FormApp.openById(files.next().getId());
    
  return false
}


function movePoll(title) {
  
  var folders = DriveApp.getFoldersByName('FrisBotPolls')
  
  if(!folders.hasNext())
    return
  
  var folder = folders.next()
  
  
  var files = DriveApp.getFilesByName(title);
      
  if(!files.hasNext())
    return
    
  var file = files.next()
  
  
  var parents = file.getParents();
  while(parents.hasNext()) 
    parents.next().removeFile(file)
  
  
  folder.addFile(file)
  
}






function checkResults(title){
  
  if(title) {
    var poll = openPoll(title);
  }
  else {
    var scriptProperties = PropertiesService.getScriptProperties()
    var link = scriptProperties.getProperty('poll_edit'); 
    var poll = FormApp.openByUrl(link);
  }
  
  if(!poll)
    return
  
  Logger.log("Checking results for " + poll.getTitle());
  
  
  var responses = poll.getResponses();
  
  var results = []; //prepare a list of all time choices to count frequency
  var name = "";
  var resultnames = [];
  
  for (var i = 0; i < responses.length; i++) {
    
    var formResponse = responses[i];
    var itemResponses = formResponse.getItemResponses();
    
    for (var j = 0; j < itemResponses.length; j++) {
      
      var itemResponse = itemResponses[j];
      var q = itemResponses[j].getItem().getTitle();
      
      if(q.toLowerCase().indexOf('friday') != -1) {
        
        var response = itemResponse.getResponse();
        
        for (var j = 0; j < response.length; j++) {
          results.push(response[j]);
          resultnames.push(name); //collect names with each response
        }
        
        name = "";
        
      }
      else if(q.toLowerCase().indexOf('name') != -1) {
        
         name = itemResponse.getResponse();
        
      }
      
    }
    
  }
 
 
  //find most frequent response
  var mf = 0; 
  var m = 0; 
  var result; 
  
  for (var i=0; i<results.length; i++) {
    for (var j=i; j<results.length; j++) {
      if (results[i] == results[j])
        m++;
      if (mf<m) {
        mf=m; 
        result = results[i];
      }
    }
    m=0;
  }
  
  Logger.log("Result: " + result + " ( " + mf + " times ) ") ;
  
  
  //find indices of chosen time in results,
  //and pull out attending names from resultnames
  
  var attending = [];
  for(i = 0; i < results.length; i++)
    if (results[i] === result)
      if(resultnames[i].length > 0)
        attending.push(resultnames[i]);
  
  Logger.log(attending);
  
  return {'time': result, 'votes': mf, 'names': attending};
  
}
