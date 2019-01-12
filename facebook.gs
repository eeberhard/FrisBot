//functions to automatically post updates to group facebook page


//needed - fetch accessToken using fb.Login API

//returns most recent item in Fris Bot's feed
function testGet() {
  var accessToken = "EAACEdEose0cBAIuDJnGSxzLG872BoJnO8zm6rgiMMfQFIPtU76oQNrSwyefKxVIJLMuViFcT5esb02ZBoTYRabEvo7yXWVf3oDRPjAjzxq6EvAH3088QZBbQAyofumCun9ujP6hlZAvGHzMIZAxmZBmxDtZAOwQNbE5hppuWudLRGAqTsNjZCc8CoSw5FZC3SZAqSphdsebtikqJrAr5Bebth";
  var frisbotID = "110048059859857";
  
  var request = "/feed?limit=1"
  
  var url = "https://graph.facebook.com/" + frisbotID + request + "&access_token=" + accessToken;
  
  var response = UrlFetchApp.fetch(url);
  
  Logger.log(response);
}

//posts a status as FrisBot
function testPost() {
  
  var accessToken = "EAACEdEose0cBAIuDJnGSxzLG872BoJnO8zm6rgiMMfQFIPtU76oQNrSwyefKxVIJLMuViFcT5esb02ZBoTYRabEvo7yXWVf3oDRPjAjzxq6EvAH3088QZBbQAyofumCun9ujP6hlZAvGHzMIZAxmZBmxDtZAOwQNbE5hppuWudLRGAqTsNjZCc8CoSw5FZC3SZAqSphdsebtikqJrAr5Bebth";
  var frisbotID = "110048059859857";
  
  var date = new Date().toString();
  var message = "Test Post\n" + date;

  
  var url = "https://graph.facebook.com/" + frisbotID + "/feed";
  
  var params = {method: 'post', payload: {message: message, access_token: accessToken}};
  
  
  var response = UrlFetchApp.fetch(url, params);
  
  Logger.log(response);
  
}
