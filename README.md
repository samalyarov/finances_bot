# Finances logging bot

A simple script that uses telegram bot API in order to create a simple transaction logging process. 
- Telegram bot acts as an input point for data (collecting required data through a series of questions utilizing context menus). 
- Values for different menus for display are copied from a Google Spreadsheet (from technical sheet), whilst another sheet acts as a 'bot input sheet', onto which the script records the data recieved.
- The script also requires a file or a screenshot as a transaction confirmation (ideally - a screenshot from a banking app) that gets stored in a designated Google Drive folder.
- The bot solves a problem of a small startup company, allowing for efficient logging of transaction and further financial analysis on a small to medium scale (using only spreadsheets, as that is sufficient at the current level of company development). The script is also used by me for personal finances.
- Avenues of further development include: introducing safety measures (checking user_id before logging anything; filtering out any formulae etc). 

*Tools used: javascript, Apps Script, Google Drive, Google Spreadsheets*
