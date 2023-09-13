# Finances logging bot
A simple script that uses telegram bot API in order to record transactions into Google Spreadsheet of choice. 

![image](https://github.com/samalyarov/finances_bot/assets/107198574/140060d5-958b-4e55-8fff-8c39adc8d623)

- Telegram bot acts as an input point for data (collecting required data through a series of questions utilizing context menus).
- Values for different menus for display are copied from a Google Spreadsheet (from technical sheet), whilst another sheet acts as a 'bot input sheet', onto which the script records the data recieved.
- The script also requires a file or a screenshot as a transaction confirmation (ideally - a screenshot from a banking app) that gets stored in a designated Google Drive folder.
- The bot solves a problem of a small startup company, allowing for efficient logging of transaction and further financial analysis on a small to medium scale (using only spreadsheets, as that is sufficient at the current level of company development). The script is also used by me for personal finances.
- Script 'works' through a designated Google account. As such, an account that launches it should have access to the Spreadsheet and Google Drive in question. Additionally, there is a limit on total number of scripts that each account can have running via Apps Script, so that needs to be considered as well.
- Avenues of further development include:
  - Introducing safety measures (checking user_id before logging anything; filtering out any formulae etc).
  - Streamlining the code (currently has too complicated 'if-else' structure in some parts of it)
  - Moving on to a separate platform if the scale of operations gets too high ([Apps Script](https://script.google.com/home) has some severe limitations)
  - In case of further expansion - the script needs to be adapted to work with a database instead of a simple spreadsheet.

*Tools used: javascript, Apps Script, Google Drive, Google Spreadsheets*
