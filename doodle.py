import time
import numpy as np
from contextlib import closing
from selenium.webdriver import Chrome # pip install selenium
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.chrome.options import Options
import credentials as cred


#make sure the chromium driver is in the path
CHROME_PATH = '/usr/bin/google-chrome'
CHROMEDRIVER_PATH = '/Users/enricoeberhard/Documents/Dev/Python/webpy/bin/chromedriver'
WINDOW_SIZE = "1920,1080"

chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--window-size=%s" % WINDOW_SIZE)
#chrome_options.binary_location = CHROME_PATH




def loginToDoodle(browser):
	
	print("Logging in to doodle")
	
	doodle = "http://doodle.com/login"
	browser.get(doodle)
	
	# wait for the page to load until we find login form
	element = WebDriverWait(browser, timeout=10).until(
		lambda x: x.find_element_by_id('d-email'))

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
	element = WebDriverWait(browser, timeout=10).until(
		lambda x: x.find_element_by_id('d-pollCreationShortcutTitle'))
		
	print("Creating new poll")

	#fill the "create new poll" shortcut field
	element.clear()
	element.send_keys(title)

	#click the create poll button
	createButton = browser.find_element_by_class_name('d-pollCreationShortcutButton')
	createButton.click()


	#wait to get to poll detail page
	element = WebDriverWait(browser, timeout=10).until(
		lambda x: x.find_element_by_id('d-pollDescription'))

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
	
	print("Adding dates and times")
	
	for date in dates:
		thisdate = WebDriverWait(browser, timeout=60).until(
			lambda x: x.find_element_by_xpath("//td[@data-date='" + date + "']"))
		thisdate.click()

	#click the "add times" button (assumption is new poll with no times entered)
	addTimes = browser.find_element_by_xpath("//div[@class='d-wizardDatetimePickerContainer']//button[1]") #div[1]
	addTimes.click()


	timeInput = browser.find_element_by_xpath("//section[@id='d-wizardTimePickerView']//input[@id='d-timePickerInput']")
	timeInputDone = browser.find_element_by_xpath("//section[@id='d-wizardTimePickerView']//button[@id='d-doneButton']")

	for t in range(0,len(times)):
		if (t > 0): #click the add more times button
			addMoreTimes = WebDriverWait(browser, timeout=10).until(
				lambda x: x.find_element_by_xpath("//li[@class='d-addMoreTimesContainer']//button[1]"))
			addMoreTimes.click()

		timeStart = WebDriverWait(browser, timeout=10).until(
			lambda x: x.find_element_by_xpath("//div[@class='d-datetimePickerOptions']//li["+str(t+1)+"]/div[1]/div[1]//input[1]"))
		timeStart.click()
		time.sleep(0.2)
		timeInput.clear()
		timeInput.send_keys(times[t][0])
		timeInputDone.click()

		timeEnd = WebDriverWait(browser, timeout=10).until(
			lambda x: x.find_element_by_xpath("//div[@class='d-datetimePickerOptions']//li["+str(t+1)+"]/div[1]/div[2]//input[1]"))
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
	finish = WebDriverWait(browser, timeout=10).until(
		lambda x: x.find_element_by_id('d-persistPollButton'))

	finish.click()

	linkObj = WebDriverWait(browser, timeout=10).until(
		lambda x: x.find_element_by_id('d-pollLink'))

	link = linkObj.get_attribute('value');
	
	return link




def newDoodlePoll(title,description,dates,times):

	# use chrome to get page with javascript generated content
	with closing(Chrome(executable_path=CHROMEDRIVER_PATH,chrome_options=chrome_options)) as browser:

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
	
	with closing(Chrome(executable_path=CHROMEDRIVER_PATH,chrome_options=chrome_options)) as browser:
		
		browser.get(poll)
		
		# wait for the page to load until we find responses
		dOptions = WebDriverWait(browser, timeout=10).until(
		lambda x: x.find_elements_by_xpath("//ul[@class='d-options']/li"))

		times = list()
		votes = list()

		#for each time column, find the time and the votes
		for option in dOptions:
			times.append(option.find_element_by_class_name('d-time').text)
			votes.append(int(option.find_element_by_class_name('d-text').text))

	#top = votes.index(np.max(votes))	#return earliest time with max votes
	top = len(votes) - 1 - votes[::-1].index(np.max(votes))	#return latest time with max votes

	result = "Most popular time is {t} with {v} votes".format(t=times[top],v=votes[top])
	print(result)

	return {'toptime':times[top], 'topvotes':votes[top], 'alltimes':times, 'allvotes':votes, 'top':top}







