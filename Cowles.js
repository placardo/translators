{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Cowles",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?cowles.yale.edu/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 320,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-21 12:23:10"
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
	if (url.includes('/cfp/')) {
		return "journalArticle";
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
	var href = "";
	var title = "";
	for (let row of rows) {
		var paper = row.querySelector("td")
		.textContent
		.trim()
		.toLowerCase()
		.replace(".", "")
		.split(" ");
		// There are three types of documents: monographs (books), discussion papers (reports) and papers which were published
		// This query method works on the monograph pages and the authors' pages for now
		if (paper[0] == "cfm") {
			href = root + "/" + paper.join("-");
			title = row.querySelector("td.views-field-field-paper-title a").textContent;
		}
		else if (paper[0] == "cfdp") {
			href = root + "/publications/" + paper[0] + "/" + paper.join("-");
			title = row.querySelector("td.views-field-field-author-from-list strong a").textContent;
		}
		else if (paper[0] == "cfp") {
			href = root + "/publications/" + paper[0] + "/" + paper.join("");
			title = row.querySelector("td.views-field-field-author-from-list strong a").textContent;
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
	var pdfurl = "";
	var item = null;
	// Each type of document follow a different layout, which seems to be the same inside all three categories
	if (url.includes('/cfp/')) {
		item = new Zotero.Item("journalArticle");
		item.title = doc.evaluate("//strong[contains(., 'CFP Paper Title')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.publicationTitle = doc.evaluate("//strong[contains(., 'Journal')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.date = doc.evaluate("//strong[contains(., 'CFP Date')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.volume = doc.evaluate("//strong[contains(., 'CFP Vol(Issue)')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent.split('(')[0];
		item.issue = doc.evaluate("//strong[contains(., 'CFP Vol(Issue)')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent.split('(')[1][0];
		item.pages = doc.evaluate("//strong[contains(., 'CFP page numbers')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		author = doc.querySelectorAll("div.comma span.comma a");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth.textContent,"author",false));
		item.url = doc.evaluate("//strong[contains(., 'CFP Paper Title')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.getAttribute('href');
		item.libraryCatalog = "Cowles Foundation";
		try {
			item.extra = "See also: " + doc.evaluate("//strong[contains(., 'See CFDP')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		}
		catch (err) {}
	}
	else if (url.includes('/cfdp/')) {
		item = new Zotero.Item("report");
		item.title = doc.querySelector('h3 a').textContent;
		item.reportType = "Cowles Foundation Discussion Paper";
		item.reportNumber = doc.querySelector("#page-title").textContent.match(/\d+/)[0];
		author = doc.querySelectorAll("div.comma span.comma a");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth.textContent,"author",false));

		item.libraryCatalog = "Cowles Foundation";
		item.date = doc.evaluate("//strong[contains(., 'Publication Date')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		item.pages = doc.evaluate("//strong[contains(., 'Pages')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().nextSibling.textContent;
		try {
			item.abstractNote = doc.evaluate("//strong[contains(., 'Abstract')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext().parentElement.nextSibling.textContent;
		}
		catch (err) {}
		pdfurl = doc.querySelector('h3 a').getAttribute('href');
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
		item.libraryCatalog = "Cowles Foundation";
		
		var status = "";
		var author = doc.querySelector(".field-name-field-paper-title p a")
		.previousSibling
		.textContent
		.trim()
		.split(",");
		if (author[1] == " ed." || author[1] == " eds.") status = "editor";
		else status = "author";
		
		if (author[0].search(" and ") != -1) {
			var authors = author[0].split(" and ");
			for (let auth of authors){
				item.creators.push(ZU.cleanAuthor(auth,status,false));
			}
		}
		else if (author[0].search(" & ") != -1) item.creators.push(ZU.cleanAuthor(author[0].split(" & ")[0],status,false));
		else item.creators.push(ZU.cleanAuthor(author[0],status,false));
		
		try {
			var editor = doc.querySelector(".field-name-field-paper-title p a").nextSibling.textContent.trim().split(", ");
			if (editor[1].search("ed.") != -1) {
				item.edition = editor[1];
				item.publisher = editor[2];
			}
			else item.publisher = editor[1];
			item.date = editor[editor.length-1].split(" ")[0];
		}
		catch (err) {}
		
		pdfurl = root + doc.querySelector('a[href*="/pub/"]').getAttribute('href');
		item.attachments.push({
			title: item.title,
			mimeType:"application/pdf",
			url:pdfurl
		});
	}
	
	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cowles.yale.edu/author/herbert-e-scarf",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/publications/cfp/cfp1573",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "How to Compute Equilibrium Prices in 1891",
				"creators": [
					{
						"firstName": "William C.",
						"lastName": "Brainard",
						"creatorType": "author"
					},
					{
						"firstName": "Herbert E.",
						"lastName": "Scarf",
						"creatorType": "author"
					}
				],
				"date": "January, 2005",
				"extra": "See also: CFDP 1272",
				"issue": "1",
				"libraryCatalog": "Cowles Foundation",
				"pages": "57–83",
				"publicationTitle": "American Journal of Economics and Sociology",
				"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1536-7150.2005.00349.x/full",
				"volume": "64",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/publications/cfdp/cfdp-1415",
		"items": [
			{
				"itemType": "report",
				"title": "Two New Proofs of Afriat's Theorem",
				"creators": [
					{
						"firstName": "Ana",
						"lastName": "Fostel",
						"creatorType": "author"
					},
					{
						"firstName": "Herbert E.",
						"lastName": "Scarf",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Todd",
						"creatorType": "author"
					}
				],
				"date": "May 2003",
				"abstractNote": "We provide two new, simple proofs of Afriat’s celebrated theorem stating that a ﬁnite set of price-quantity observations is consistent with utility maximization if, and only if, the observations satisfy a variation of the Strong Axiom of Revealed Preference known as the Generalized Axiom of Revealed Preference.",
				"libraryCatalog": "Cowles Foundation",
				"pages": "10",
				"reportNumber": "1415",
				"reportType": "Cowles Foundation Discussion Paper",
				"attachments": [
					{
						"title": "Two New Proofs of Afriat's Theorem",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/publications/archives/cfm",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/cfm-5",
		"items": [
			{
				"itemType": "book",
				"title": "The Variate Diﬀerence Method",
				"creators": [
					{
						"firstName": "Gerhard",
						"lastName": "Tintner",
						"creatorType": "author"
					}
				],
				"date": "1940",
				"libraryCatalog": "Cowles Foundation",
				"publisher": "Principia Press",
				"series": "Cowles Monograph",
				"seriesNumber": "5",
				"attachments": [
					{
						"title": "The Variate Diﬀerence Method",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
