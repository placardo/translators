{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Cowles",
	"creator": "Vincent Carret",
	"target": "https?://(www\\\\.)?cowles.yale.edu/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 320,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-20 22:50:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Vincent Carret
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
  // TODO: adjust the logic here
  if(url.includes('/cfp/')){
  	return "journalArticle"
  }
  else if (url.includes('/cfdp/')) {
	return "report";
  }
  else if (url.includes('/cfm-')) {
	return "book";
  }
  else if (getSearchResults(doc, true)) {
	return "multiple";
  }
  return false;
}

function getSearchResults(doc, checkOnly) {
	var root = "https://cowles.yale.edu";
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".views-table tbody tr");
	for (let row of rows) {
		paper = row.querySelector("td").textContent.trim().toLowerCase().replace(".","").split(" ");
		if(paper[0] == "cfm"){
			var href = root + "/" + paper.join("-");
			var title = row.querySelector("td.views-field-field-paper-title a").textContent;
		}
		else if(paper[0] == "cfdp"){
			var href = root + "/publications/" + paper[0] + "/" + paper.join("-");
			var title = row.querySelector("td.views-field-field-author-from-list strong a").textContent;
		}
		else if(paper[0] == "cfp"){
			var href = root + "/publications/" + paper[0] + "/" + paper.join("");
			var title = row.querySelector("td.views-field-field-author-from-list strong a").textContent;
		}
		
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, false), function (items) {
		if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }
}

function scrape(doc, url){
	var root = "https://cowles.yale.edu";
	if (url.includes('/cfp/')) {
		item = new Zotero.Item("journalArticle");
		item.title = doc.evaluate("//strong[contains(., 'CFP Paper Title')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.publicationTitle = doc.evaluate("//strong[contains(., 'Journal')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.date = doc.evaluate("//strong[contains(., 'CFP Date')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.volume = doc.evaluate("//strong[contains(., 'CFP Vol(Issue)')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent.split('(')[0];
		item.issue = doc.evaluate("//strong[contains(., 'CFP Vol(Issue)')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent.split('(')[1][0];
		item.pages = doc.evaluate("//strong[contains(., 'CFP page numbers')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		author = doc.querySelectorAll("div.comma span.comma a");
		for(let auth of author) item.creators.push(ZU.cleanAuthor(auth.textContent,"author",false));
		item.url = doc.evaluate("//strong[contains(., 'CFP Paper Title')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.getAttribute('href');
		item.libraryCatalog = "Cowles Foundation"
		item.extra = "See also: " + doc.evaluate("//strong[contains(., 'See CFDP')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
	}
	else if(url.includes('/cfdp/')) {
		item = new Zotero.Item("report");
		item.title = doc.querySelector('h3 a').textContent;
		item.reportType = "Cowles Foundation Discussion Paper";
		item.reportNumber = doc.querySelector("#page-title").textContent.match(/\d+/)[0];
		author = doc.querySelectorAll("div.comma span.comma a");
		for(let auth of author) item.creators.push(ZU.cleanAuthor(auth.textContent,"author",false));

		item.libraryCatalog = "Cowles Foundation"
		item.date = doc.evaluate("//strong[contains(., 'Publication Date')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.pages = doc.evaluate("//strong[contains(., 'Pages')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.abstractNote = doc.evaluate("//strong[contains(., 'Abstract')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().parentElement.nextSibling.textContent;
		var pdfurl = doc.querySelector('h3 a').getAttribute('href');
		item.attachments.push({
			title: item.title,
			mimeType:"application/pdf",
			url:pdfurl
		});
	}
	else if (url.includes('/cfm-')) {
		item = new Zotero.Item("book");
		item.title = doc.querySelector('a[href*="/pub/"]').textContent;
		item.series = "Cowles Monograph";
		item.seriesNumber = doc.querySelector("#page-title").textContent.match(/\d+/)[0];
		item.libraryCatalog = "Cowles Foundation"
		
		var tmp = doc.querySelector(".field-name-field-paper-title p").textContent.split(", ");
		var status = "";
		var author = doc.querySelector(".field-name-field-paper-title p a").previousSibling.textContent.trim().split(",");
		if(author[1] == " ed." || author[1] == " eds.") status = "editor";
		else status = "author";
		
		if(author[0].search(" and ") != -1){
			var authors = author[0].split(" and ")
			for(let auth of authors){
				item.creators.push(ZU.cleanAuthor(auth,status,false))
			}
		}		
		else if(author[0].search(" & ") != -1) item.creators.push(ZU.cleanAuthor(author[0].split(" & ")[0],status,false))
		else item.creators.push(ZU.cleanAuthor(author[0],status,false));
		
		try{
			var editor = doc.querySelector(".field-name-field-paper-title p a").nextSibling.textContent.trim().split(", ");
			if(editor[1].search("ed.") != -1){
				item.edition = editor[1]
				item.publisher = editor[2]
			}
			else item.publisher = editor[1]
			item.date = editor[editor.length-1].split(" ")[0]
		}
		catch(err){
		}
		
		var pdfurl = root + doc.querySelector('a[href*="/pub/"]').getAttribute('href');
		item.attachments.push({
			title: item.title,
			mimeType:"application/pdf",
			url:pdfurl
		});
	}
	
	item.complete();
}


