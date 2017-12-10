#!/usr/bin/env python
import re
import sys
import time
import datetime
import numpy as np
import collections
import xkcd
import doodle
import bbcweather as bbc
import credentials as cred
import simplemail as email

# Python script to automate frisbee management
# 1) scrape bbc weather for Friday forecast information
# 2) create and populate Doodle poll based on weather conditions
# 3) email out nicely formatted message with forecast and link to poll
# 4) save a file with datestamp so there's only one poll/email per week


#some constants
logfile = "FrisBotLog.txt"

debugMail = 'eeberhard@rvc.ac.uk'

today_ = datetime.date.today()
daysToFri = (4-today_.weekday()) % 7
nextFri_ = today_ + datetime.timedelta(daysToFri)

today = today_.strftime('%y-%m-%d') #in yy-mm-dd for BBC
nextFri = nextFri_.strftime('%Y-%m-%d') #in yyyy-mm-dd for doodle


#set with the "test" argument, stops emails to group
debug = False


#for list of times ex: ['09,'12',15'], find index closest to some supplied time eg: '08'
def findClosestIndexedTime(time, times):
	dists = [time - int(t) for t in times] #list of differences between listed times and given time
	
	timeInd = dists.index(int(np.sqrt(np.min(np.square(dists))))) #the index of the closest listed time to given time

	return timeInd


def evaluateConditions(daysAhead, startTime, endTime):
	
	forecast = bbc.retrieveWeather(bbc.locations['PBR'],daysAhead)
	
	#if windspeed is over 12mph, temp below 5C or rain during/before, inside only
	#time range for the day (we'll take an average for the forecast)
	try:
		start = forecast['time'].index(startTime)
	except:
		#find closest forecast time to startTime
		start = findClosestIndexedTime(startTime, forecast['time'])
		print("Start time {s} was closest to avaiable forecast time {f}".format(
			  s=startTime, f=forecast['time'][start]))

	try:
		end = forecast['time'].index(endTime)
	except:
		#find closest forecast time to startTime
		end = findClosestIndexedTime(endTime, forecast['time'])
		print("End time {s} was closest to avaiable forecast time {f}".format(
			  s=endTime, f=forecast['time'][end]))

	
	avgWind = np.mean([int(x) for x in forecast['windspeed'][start:end+1]])
	avgTemp = np.mean([int(x) for x in forecast['temperature'][start:end+1]])
	avgVis = np.mean([forecast['visList'].index(x) for x in forecast['visibility'][start:end+1]])
	
	#for text based weather types, check for the presence of any "no-go" terms (e.g. rain, storm)
	#by making a (lower-case) sentence out of the conditions throughout the day
	types = " ".join([t.lower() for t in forecast['weather-type'][start:end+1]])
	nogoTypes = ['drizzle','rain','shower','storm','snow','sleet','hail','thunder']

	#this returns the most frequent weather type in the time range (first if same number occurences)
	avgType = collections.Counter(forecast['weather-type'][start:end+1]).most_common(1)[0][0]


	averages = {'wind':avgWind, 'temp':avgTemp, 'vis':avgVis, 'type':avgType}

	desc = "General forecast for Friday: {type}. The temperature will be around {temp}ºC with {wind}mph wind".format(
					type=avgType, temp=int(round(avgTemp)), wind=int(round(avgWind)))
	
	ss = forecast['sunset']
	if(ss < 1730):
		desc = desc + ", and sunset will be at {h:02d}:{m:02d}".format(h=ss//100,m=ss%100)

	#an interesting way of checking each no-go type against the day's conditions
	nogoList = [nogo for nogo in nogoTypes if nogo in types]
	
	#make shower into showers if it's in the nogoList, so it's nicer to read
	if 'shower' in nogoList:
		ind = nogoList.index('shower')
		nogoList[ind] = nogoList[ind] + 's'
	
	
	if(avgWind > 12):
		nogoList.append('high winds')
	
	if(avgTemp < 7):
		nogoList.append('cold temperature')

	if(avgTemp > 30):
		nogoList.append('high temperature')

	if(avgVis < 1):
		nogoList.append('poor visibility')


	#Are we a go for outside?
	outside = True
	times = [("13","14:30"),("14","15:30")]

	if(len(nogoList) > 0):
		outside = False
		
		nogo = "{d}. Outside conditions will likely be unsuitable with periods of {r}".format
		
		if(len(nogoList) == 1):
			desc = nogo(d=desc,r=nogoList[0])
		else:
			desc = nogo(d=desc, r= ", ".join(nogoList[:-1]) + " and " + nogoList[-1])
	else:
		outside = True
		times.append(("12","13:30"))
		
		if(ss > 1600):
			times.append(("15","16:30"))
		
		desc = desc + ". It should be possible to play outside on the sports field"


	desc = desc + "."
	return {'forecast':forecast, 'description':desc, 'times':times, 'outside':outside, 'averages':averages}



def sendPollMail(poll):
	
	SUBJECT = "RELAY: <{title}>".format(title=poll['title'])
	
	greet_text = "Hello frisbee players, \n\nThis is another automated message to " + \
				"organize a game for Friday afternoon. \n\n"
	greet_html = "<p>Hello frisbee players, </p><p>This is another automated message to " + \
				"organize a game for Friday afternoon. </p>"


	comic = xkcd.random()
	
	greet_text = greet_text + "But first, a random xkcd comic to make me seem more " + \
		"relatable and less like a computer program: \n\n{t}\n".format(t=xkcd.strinfo(comic))

	greet_html = greet_html + "<p> But first, a random xkcd comic to make me seem more " + \
	"relatable and less like a computer program: </p>" + \
	"<p><img src=\"{image_url}\" alt=\"xkcd {number}\"></p>".format(**comic)

	TEXT = "{greet}{desc}\n\nDo the poll here:\n{link}\n\nFrisBot"
	TEXT = TEXT.format(greet=greet_text, desc=poll['description'], link=poll['link'])
	
	HTML = """\
		<html>
		<head></head>
		<body>
		{greet}
		<p>{desc}</p>
		<p><b><font size="+1"><a href="{link}">Do the Doodle Poll</a></b></font></p>
		<p>FrisBot</p>
		<p><i><font size="1">
		Poll and email generated automatically with Python and JavaScript.
		Please report bugs to eeberhard@rvc.ac.uk <br>
		<a href="mailto:smlfrisbot@gmail.com?subject=unsubscribe&body=Send this to unsubscribe">
		Unsubscribe from this list</a>
		</font></i></p>
		</body>
		</html>
		"""
	HTML = HTML.format(greet=greet_html, desc=poll['description'], link=poll['link'])
	
	print("Sending following email:\n\n")
	print(TEXT)
	
	mail = {
		'to':[cred.mail['email']], #send to self to be relayed to frisbee group
		'subject':SUBJECT,
		'text':TEXT,
		'html':HTML
	}
	
	if debug:
		mail['to'] = [debugMail]

	email.sendMail(mail,cred.mail)



def generatePollDetails():

	title = "Frisbee Friday {0}".format(nextFri_.strftime('%d %b')) #example: 17 Nov
	
	check = evaluateConditions(daysToFri,'09','15')
	
	description = check['description']
	
	dates = [nextFri]
	times = check['times']
	
	print("----- Making poll with following title, description, dates and times:\n")
	print(title)
	print(description)
	print(dates)
	print(times)
	print("\n")
	
	poll = {'title':title, 'description':description, 'dates':dates, 'times':times}

	return poll



def makeAndSendFrisbeePoll():
	#make sure Friday isn't too far away (more than x days)
	if daysToFri > 3:
		print("Friday is too far away for reliable forecasting ({} days)".format(daysToFri))
		exit()
	
	#check if this script has run already this week
	with open(logfile, 'r') as fp:
		nextFriLines = [line for line in fp if nextFri in line]
		fp.close()

	poll_link = False

	for line in nextFriLines:
		if 'poll_mail_sent' in line:
			print("Poll mail already sent out for {}".format(nextFri))
			return
		
		result = re.search('(http.*?poll\/[\w\d]+)',line)
		if result:
			poll_link = result.group(1)

	poll = generatePollDetails()
	
	if not poll_link:
		#create a new poll
		poll['link'] = doodle.newDoodlePoll(**poll)
		#log poll creation
		timestamp = time.strftime('%y-%m-%d %H:%M',time.localtime())
		with open(logfile, 'a') as fp:
			fp.write("{t}\t{d}\t{l}\n".format(t=timestamp, d=nextFri, l=poll['link']))
			fp.close()
	else:
		poll['link'] = poll_link

	#send email
	sendPollMail(poll)
	#log the sending of the mail
	timestamp = time.strftime('%y-%m-%d %H:%M',time.localtime())
	with open(logfile, 'a') as fp:
		fp.write("{t}\t{d}\tpoll_mail_sent\n".format(t=timestamp, d=nextFri))
		fp.close()



def getAndSendPollResults(date):

	#get the log line matching the date
	#check if this script has run already this week
	with open(logfile, 'r') as fp:
		nextFriLines = [line for line in fp if date in line]
		fp.close()
	
	poll_link = False

	for line in nextFriLines:
	
		if 'conf_mail_sent' in line:
			print("Confirmation mail already sent out for {}".format(date))
			return
		result = re.search('(http.*?poll\/[\w\d]+)',line)
		if result:
			poll_link = result.group(1)


	
	if not poll_link:
		print("No log line found with date {}".format(date))
		return

	print("Logged doodle poll for date {d}: {l}".format(d=date, l=poll_link))

	result = doodle.chooseTime(poll_link)

	date_struct = time.strptime(date,'%Y-%m-%d')

	subject = "RELAY: <Update: Frisbee Friday {d} {m}>".format(d=date_struct.tm_mday,
													m=time.strftime('%b',date_struct))
	text = "Hello all, \n\n"
	html = """\
		<html>
		<head></head>
		<body>
		<p>Hello all, </p>"""

	if(result['topvotes'] >= 6):
		
		line = "There are enough numbers for a game, with {v} votes for {t}".format(
			v=result['topvotes'], t=result['toptime'])
		html = html + "<p>" + line + " (<a href=\"{l}\">doodle poll</a>)!</p>".format(l=poll_link)
		text = text + line + " ({l})! \n\n".format(l=poll_link)


		#get forecast for top time
		daysToDate = date_struct.tm_yday - time.localtime().tm_yday

		#first two digits are start hour, plus 1 for close-to-end hour
		gameStart = result['toptime'][:2]
		gameEnd = "{0:02d}".format(int(result['toptime'][:2]) + 1)
		
		
		#check if toptime is within sports hall time (13:00 to 16:00)
		gameStartNum = int(gameStart)*100 + int(result['toptime'][3:5])
		inside = not (gameStartNum < 1300 or gameStartNum > 1430)
		
		#check whether weather is suitable in the voted time
		w = evaluateConditions(daysToDate,gameStart,gameEnd)
		
		avg = w['averages']
		
		line = "The most recent forecast for that period is: " + \
				"{type}. The temperature will be around {temp:d}ºC with {wind:d}mph wind.".format(
				type=avg['type'], temp=int(round(avg['temp'])), wind=int(round(avg['wind'])))

		html = html + "<p>" + line + "</p>"
		text = text + line + "\n\n"

		if w['outside']:
			line = "Meet on the sports field at {t}!".format(t=result['toptime'][:5])
		elif (inside):
			line = "Meet in the sports hall at {t}!".format(t=result['toptime'][:5])
		else:
			debug = True #sends mail only to debug group, not everyone
			line = "The weather may now be unsuitable outside, but the voted time is " + \
					"not during regular sports hall slot (13:00 - 15:00). " + \
					"This calls for human supervision... stay tuned for an update."

		html = html + "<p>" + line + "</p>"
		text = text + line + "\n\n"

	
	else:
		line = "There are not enough numbers for a full game, with only {v} vote{s} for {t}".format(
				v=result['topvotes'], t=result['toptime'], s=('' if result['topvotes']==1 else 's'))
		html = html + "<p>" + line + " (<a href=\"{l}\">doodle poll</a>).</p>".format(l=poll_link)
		text = text + line + " ({l}).\n\n".format(l=poll_link)


	html = html + "<p>FrisBot</p></body></html>"
	text = text + "FrisBot"

	print("Sending following email:\n\n")
	print(text)

	mail = {
		'to':[cred.mail['email']], #send to self to be relayed to frisbee group
		'subject':subject,
		'text':text,
		'html':html
	}
	
	if debug:
		mail['to'] = [debugMail]

	email.sendMail(mail,cred.mail)

	timestamp = time.strftime('%y-%m-%d %H:%M',time.localtime())
	with open(logfile, 'a') as fp:
		fp.write("{t}\t{d}\tconf_mail_sent\n".format(t=timestamp, d=date))
		fp.close()


if __name__ == '__main__':
	
	timestamp = time.strftime('%y-%m-%d %H:%M',time.localtime())
	
	if len(sys.argv) > 1:
		task = sys.argv[1]
		
		if task == 'create':
			#log the calling of the main function
			with open(logfile, 'a') as fp:
				fp.write("{t}\tlaunched create process\n".
							format(t=timestamp))
				fp.close()
			makeAndSendFrisbeePoll()
			exit()
		elif task == 'confirm':
			if len(sys.argv) < 3:
				with open(logfile, 'a') as fp:
					fp.write("{t}\tlaunched confirm process for date {d}\n".
							 format(t=timestamp, d=nextFri))
					fp.close()
				getAndSendPollResults(nextFri)
			else:
				with open(logfile, 'a') as fp:
					fp.write("{t}\tlaunched confirm process for date {d}\n".
							format(t=timestamp, d=sys.argv[2]))
					fp.close()
				getAndSendPollResults(sys.argv[2])
			exit()
		elif task == 'test':
			debug = True
			if len(sys.argv) < 3:
				print("Creating poll and sending test email")
				makeAndSendFrisbeePoll()
			else:
				print("Confirming poll and sending test email")
				getAndSendPollResults(nextFri)
			exit()

	print("""FrisBot help
	FrisBot.py create\t\t\t| makes a new poll next friday
	FrisBot.py confirm [yyyy-mm-dd]\t\t| confirms a logged poll on a date (default is next Friday)""")



