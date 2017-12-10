import re
import time
from sys import platform 
import numpy as np
from contextlib import closing
from selenium.webdriver import PhantomJS
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options as ChromeOptions
import credentials as cred

driver_options = {}

if platform == "linux":
	DRIVER = PhantomJS
	#driver_options['executable_path'] = '/usr/bin'
	TIMEOUT = 240
else:
	DRIVER = Chrome
	chrome_options = ChromeOptions()
	chrome_options.add_argument("--headless")
	chrome_options.add_argument("--window-size=1080,720")
	#driver_options['executable_path'] = '/usr/bin'
	driver_options['chrome_options'] = chrome_options
	TIMEOUT = 10

def loginToDoodle(browser):
	
	print("Logging in to doodle")
	
	doodle = "http://doodle.com/login"
	browser.get(doodle)
	
	# wait for the page to load until we find login form
	element = browser.find_element_by_id('d-email')

	#fill email field
	element.clear()
	element.send_keys(cred.doodle['email'])

	#fill password field
	element = browser.find_element_by_id('d-password')
	element.clear()
	element.send_keys(cred.doodle['password'])

	#press "Login"
	loginButton = browser.find_element_by_id('d-loginButton')
	loginButton.click()
	
	return browser



def startNewPoll(browser, title, description):
	
	# wait for the login to go through
	element = browser.find_element_by_id('d-pollCreationShortcutTitle')
		
	print("Creating new poll")

	#fill the "create new poll" shortcut field
	element.clear()
	element.send_keys(title)

	#click the create poll button
	createButton = browser.find_element_by_class_name('d-pollCreationShortcutButton')
	createButton.click()


	#wait to get to poll detail page
	element = browser.find_element_by_id('d-pollDescription')

	#title is already filled in, so now enter description and hit next
	element.clear()
	element.send_keys(description)

	nextButton = browser.find_element_by_class_name('d-nextButton')
	nextButton.click()
	
	return browser


#add date times, dates in list[n] ['yyyy-mm-dd', ...] and times as a list[n][2] ((start1,end1),(start2,end2),...,(startn,endn))
def addDateTimes(browser, dates, times):
	#wait to get to date/time selection page
	#find field data-date="2017-11-17" matching Friday's date
	
	#if month and year doesn't match date, press
	
	print("Adding dates...")
	
	for date in dates:
		
		print(date)
		
		date_ = time.strptime(date,'%Y-%m-%d')
		
		#navigate to correct month and year on calendar!
		#th id='d-currentMonth' has value "B Y" (<month name> <4digit year>)
		#button class="d-button d-previousMonth d-silentButton"
		#button class="d-button d-nextMonth d-silentButton"
		while True:
			monthObj = browser.find_element_by_xpath("//th[@id='d-currentMonth']")
				
			page_ = time.strptime(monthObj.text, '%B %Y')
			
			#same year and month
			if (page_.tm_mon == date_.tm_mon) and (page_.tm_year == date_.tm_year):
				break
	
			#if next year, or if same year but upcoming month, press next
			if (page_.tm_year < date_.tm_year) or \
			((page_.tm_year == date_.tm_year) and (page_.tm_mon < date_.tm_mon)):
				#next button
				button = browser.find_element_by_xpath("//button[@class='d-button d-nextMonth d-silentButton']")
			else:
				#previous button
				button = browser.find_element_by_xpath("//button[@class='d-button d-previousMonth d-silentButton']")
			
			button.click()
		
		thisdate = browser.find_element_by_xpath("//td[@data-date='" + date + "']")
		thisdate.click()

	#click the "add times" button (assumption is new poll with no times entered)
	addTimes = browser.find_element_by_xpath("//div[@class='d-wizardDatetimePickerContainer']//button[1]") #div[1]
	addTimes.click()


	timeInput = browser.find_element_by_xpath("//section[@id='d-wizardTimePickerView']//input[@id='d-timePickerInput']")
	timeInputDone = browser.find_element_by_xpath("//section[@id='d-wizardTimePickerView']//button[@id='d-doneButton']")

	print("Adding times...")

	for t in range(0,len(times)):
		
		print("{s} - {e}".format(s=times[t][0], e=times[t][1]))
		
		if (t > 0): #click the add more times button
			addMoreTimes = browser.find_element_by_xpath("//li[@class='d-addMoreTimesContainer']//button[1]")
			addMoreTimes.click()

		timeStart = browser.find_element_by_xpath("//div[@class='d-datetimePickerOptions']//li["+str(t+1)+"]/div[1]/div[1]//input[1]")
		timeStart.click()
		time.sleep(0.2)
		timeInput.clear()
		timeInput.send_keys(times[t][0])
		timeInputDone.click()

		timeEnd = browser.find_element_by_xpath("//div[@class='d-datetimePickerOptions']//li["+str(t+1)+"]/div[1]/div[2]//input[1]")
		timeEnd.click()
		time.sleep(0.2)
		timeInput.clear()
		timeInput.send_keys(times[t][1])
		timeInputDone.click()


	time.sleep(0.2)
	#click continue
	nextButton = browser.find_element_by_xpath("//div[@class='d-actionButtons']/button[3]")
	nextButton.click()
	
	return browser



def confirmPoll(browser):
	
	print("Confirming poll")
	
	#click to confirm the poll
	finish = browser.find_element_by_id('d-persistPollButton')

	finish.click()

	linkObj = browser.find_element_by_id('d-pollLink')

	link = linkObj.get_attribute('value');
	
	return link




def newDoodlePoll(title,description,dates,times):

	with closing(DRIVER(**driver_options)) as browser:

		#set default timeout time to find page elements
		browser.implicitly_wait(TIMEOUT)
		
		loginToDoodle(browser)

		startNewPoll(browser, title, description)

		addDateTimes(browser, dates, times)

		link = confirmPoll(browser)

	print(link)

	return link


def chooseTime(poll):
	#returns the most popular time of a poll
	
	#each column is a li with class="d-option", all children of one ul class="d-options"
	#for each li, under label class="d-headerGroup", there is
	# - div class="d-optionDate" with d-month, d-day, d-date class divs
	# - div class="d-optionDetails" with div class="d-time", and way down a div class="d-text" with the count
	
	with closing(DRIVER(**driver_options)) as browser:
		
		browser.implicitly_wait(TIMEOUT)
		
		browser.get(poll)
		
		# wait for the page to load until we find responses
		dOptions = browser.find_elements_by_xpath("//ul[@class='d-options']/li")

		times = list()
		votes = list()
		
		#option text will be 'Dec\n8\nFRI\n13:00 – 14:30\n10' on Chrome and
		#					 'Dec\n8\nFRI\n13:00 – 14:30\n10 votes' on PhantomJS
		expr = re.compile("(?P<month>\w+?)\\n(?P<date>\d+?)\\n(?P<day>\w+?)\\n(?P<time>.+)\\n(?P<votes>\d+)(?: votes?)?$")

		#for each time column, find the time and the votes
		for option in dOptions:
			match = expr.search(option.text)
			if match:
				times.append(match.group('time'))
				votes.append(int(match.group('votes')))


	#top = votes.index(np.max(votes))	#return earliest time with max votes
	top = len(votes) - 1 - votes[::-1].index(np.max(votes))	#return latest time with max votes

	result = "Most popular time is {t} with {v} votes".format(t=times[top],v=votes[top])
	print(result)

	return {'toptime':times[top], 'topvotes':votes[top], 'alltimes':times, 'allvotes':votes, 'top':top}







