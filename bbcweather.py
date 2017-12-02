import re
import time
import requests
from bs4 import BeautifulSoup

BBC_daily = "http://www.bbc.co.uk/weather/en/{location}/daily/{today}?day={daysAhead}"

locations = {
	'PBR':"2639970"
}

#get the weather forecast (max 4 days ahead)
def retrieveWeather(locationCode, daysAhead):
	
	today = time.strftime('%y-%m-%d') #in yy-mm-dd for BBC
	url = BBC_daily.format(location=locationCode, today=today, daysAhead=daysAhead)
	print("Parsing forecast from: " + url)
	
	r = requests.get(url)
	soup = BeautifulSoup(r.content, 'html.parser')
	
	trTime = soup.find('tr', class_='time') #get the time data row
	hours = [hour_.get_text() for hour_ in trTime.find_all(class_='hour')] #extract hour columns
	
	trType = soup.find('tr', class_='weather-type') #get the weather type row
	types = [type_['title'] for type_ in trType.find_all('img')] #extract weather types from columns
	
	trTemp = soup.find('tr', class_='temperature')  #get the temperature row, then each temp from columns
	elems = [temp_.find(class_='temperature-value-unit-c') for temp_ in trTemp.find_all('td')]
	tempsUnit = [elem.get_text() for elem in elems if elem is not None]
	temps = [re.sub(r"\D", "", temp_) for temp_ in tempsUnit] #get rid of trailing "ºC"
	
	trWind = soup.find('tr', class_='windspeed')
	elems = [wind_.find(class_='windspeed-value-unit-mph') for wind_ in trWind.find_all('td')]
	windsUnit = [elem.get_text() for elem in elems if elem is not None]
	winds = [re.sub(r"\D", "", wind_) for wind_ in windsUnit] #get rid of trailing "mph"
	
	trWindDir = soup.find('tr', class_='wind-direction') #get the wind direction row
	windDirs = [windDir_['title'] for windDir_ in trWindDir.find_all('abbr')] #extract wind direction
	
	trHumid = soup.find('tr', class_='humidity')
	humidities = [humid_.get_text() for humid_ in trHumid.find_all('td')]
	humidities = [re.sub("[^0-9%]", "", humid_) for humid_ in humidities] #get rid of whitespaces and \n
	
	trVis = soup.find('tr', class_='visibility')
	visibilities = [vis_['title'] for vis_ in trVis.find_all('abbr')]
	
	trPress = soup.find('tr', class_='pressure')
	pressures = [press_.get_text() for press_ in trPress.find_all('td')]
	pressures = [re.sub("[^0-9%]", "", press_) for press_ in pressures] #get rid of whitespaces and \n
	
	visList = ['Very Poor', 'Poor', 'Moderate', 'Good', 'Very Good', 'Excellent'] #ordered list from very poor to excellent (0-5)
	visListAbr = ['VP', 'P', 'M', 'G', 'VG', 'E'] #abbreviated list
	
	sunrise = soup.find('span',class_="sunrise").get_text() #in format "Sunrise hh:mm"
	sunrise = int(re.sub("[^0-9]", "", sunrise)) #convert to number format, e.g. 08:30 to 830
	sunset = soup.find('span',class_="sunset").get_text()
	sunset = int(re.sub("[^0-9]", "", sunset))
	
	forecast = {"time":hours, "weather-type":types, "temperature":temps,
		"windspeed":winds, "wind-direction":windDirs,
			"humidity":humidities, "visibility":visibilities, "pressure":pressures,
				"visList":visList, "visListAbr":visListAbr, "sunrise":sunrise, "sunset":sunset}

	return forecast



