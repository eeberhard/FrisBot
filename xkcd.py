#!python
import re
import requests as req
from bs4 import BeautifulSoup as BS

#constants: urls and regex patterns
url = 'http://xkcd.com'
r_url = 'http://c.xkcd.com/random/comic/';
link_re = re.compile("Permanent link to this comic: (http.+?/(\d+?)/)")
img_re = re.compile("Image URL \(for hotlinking/embedding\): (http.*?png)")
img_re = re.compile("Image URL \(for hotlinking/embedding\): (http.*?\.(?:(?:png)|(?:gif)))")
alt_re = re.compile("{{.lt.*?: (.*?)}}")
title_re = re.compile("{{.itle.*?: (.*?)}}")
sub_re = re.compile("{{.ubheading.*?: (.*?)}}")
trans_re = re.compile("\{{2}.*?\}{2}")

def get(url):
	
	comic = {}
	page = req.get(url)
	
	#search the raw html for the full url and comic number
	link = link_re.search(page.text)
	if link:
		comic['permalink'] = link.group(1)
		comic['number'] = link.group(2)

	#search the raw html for the image url
	comic['image_url'] = img_re.search(page.text)
	if comic['image_url']:
		comic['image_url'] = comic['image_url'].group(1)
	
	#parse the html to get the transcript element
	soup = BS(page.content, 'html.parser')
	transcript = soup.find("div", {"id": "transcript"}).get_text()

	#search the transcript for a title
	comic['title'] = title_re.search(transcript)
	if comic['title']:
		comic['title'] = comic['title'].group(1)

	#search the transcript for alt text
	comic['alt'] = alt_re.search(transcript)
	if comic['alt']:
		comic['alt'] = comic['alt'].group(1)

	#search the transcript for a subheading
	comic['subheading'] = sub_re.search(transcript)
	if comic['subheading']:
		comic['subheading'] = comic['subheading'].group(1)

	#get any transcript text that isn't tagged within {{*}}
	text = trans_re.split(transcript)
	if text:
		comic['transcript'] = "".join(text)

	return comic




def strinfo(comic):
	
	meta =	"xkcd comic {number}\n" + \
			"Permament link to this comic: {permalink}\n" + \
			"Image URL for hotlinking/embedding: {image_url}\n\n"
	
	info = "{title}{sub}{trans}{alt}"
	
	tags = {'title':"", 'sub':"", 'alt':"", 'trans':""}

	if comic['title']:
		tags['title'] = "Title:\n{0}\n\n".format(comic['title'])
	if comic['subheading']:
		tags['sub'] = "Subheading:\n{0}\n\n".format(comic['subheading'])
	if comic['alt']:
		tags['alt'] = "Alt-text:\n{0}\n".format(comic['alt'])
	if comic['transcript']:
		tags['trans'] = "Transcript:\n--------------------\n{0}--------------------\n".format(comic['transcript'])

	str = meta.format(**comic) + info.format(**tags)

	return str



def random():
	return get(r_url)

def latest():
	return get(url)

def number(num):
	c_url = "{u}/{n:d}".format(u=url,n=num)
	return get(c_url)



if __name__ == "__main__":
	print("\n--- xkcd module ---")
	print("\nGetting random comic\n")
	
	comic = random()

	print(strinfo(comic))

