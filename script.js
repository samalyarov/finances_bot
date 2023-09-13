// Base variables
var token = 'TOKEN'; // Bot token
var url = 'https://api.telegram.org/bot' + token;
var web_app_url = 'WEB_APP_URL'; // Web App link (Apps Script provide one after deployment)
var ss_id = 'TABLE_ID'; // Google Spreadsheet ID
var folder_id = 'FOLDER_ID'; // Google Drive Folder ID
var gmt_var = 'GMT+2' // For recording timestamps

// Spreadsheet-based variables
var values_sheet = 'SHEET_NAME' // Technical sheet with variables for menus and other stuff (also used for analytics)
var bot_inputs_sheet = 'SHEET_NAME' // List for logging transactions
var ss_range_type = '!A1:B' // Base range types
var ss_range_income = '!A1:B'; // Income items
var ss_range_outcome = '!A1:B'; // Outcome items
var ss_range_currency = '!A1:B'; // Available currencies
var ss_range_wallet = '!A1:B'; // Available wallets
var ss_range_date = '!A1:B'// Date option (currently only has 'Today' supported)

// Operational variables (they need to be declared here - Apps Script limitations)
var is_last_step = false;
var file_exists = false;

/** 
 * Function for WebHook creation
 * Establishing contact between the web app and the bot. Run once manually after deploying in Apps Script
 */
function set_webhook() {
  var response = UrlFetchApp.fetch(url + '/setWebhook?url=' + web_app_url);
  Logger.log(response.getContentText());
}

/** 
 * Function for sending text messages through the Telegram bot
 * Params: id of the user to whom the message is to be sent and the text itself
 */
function send_text(id, text) {
  var response = UrlFetchApp.fetch(url + '/sendMessage?chat_id=' + id + '&text=' + text);
  Logger.log(response.getContentText());
}

/** 
 * A function for performing VLOOKUP in a spreadsheet
 */
function perform_vlookup(search_value, search_column, return_column, sheet_name) {
  var spreadsheet = SpreadsheetApp.openById(ss_id);
  var sheet = spreadsheet.getSheetByName(sheet_name);
  var data = sheet.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][search_column - 1] === search_value) {
      // Return the corresponding value from the specified return column
      return data[i][return_column - 1];
    }
  }

  // Return empty string if nothing has been found
  return '';
}

/** 
 * Function for saving files into a designated Google Drive folder
 */
function save_file_to_drive(file_id, file_name, folder_id) {
  var tg_api_url = 'https://api.telegram.org/bot' + token + '/getFile?file_id=' + file_id;
  var response = UrlFetchApp.fetch(tg_api_url);
  var file_data = JSON.parse(response.getContentText());

  if (file_data.ok) {
    var file_url = 'https://api.telegram.org/file/bot' + token + '/' + file_data.result.file_path;
    var file_blob = UrlFetchApp.fetch(file_url).getBlob();
    
    try {
      var folder = DriveApp.getFolderById(folder_id);
      var drive_file = folder.createFile(file_blob);
      drive_file.setName(file_name);
      return true;
    } catch (error) {
      Logger.log('Error saving file to Google Drive: ' + error.toString());
      return false;
    }
  } else {
    Logger.log('Error getting file information from Telegram: ' + JSON.stringify(file_data));
    return false;
  }
}

/** 
 * Function for logging user states. Needed to work with users independently
 * user_state also tracks current state of conversation with each user
 */
function get_or_create_user_state(id) {
  // Retrieve user state from script properties or initialize it if not present
  var user_state = PropertiesService.getScriptProperties().getProperty(id);
  if (!user_state) {
    user_state = JSON.stringify({});
    PropertiesService.getScriptProperties().setProperty(id, user_state);
  }
  return JSON.parse(user_state);
}

/** 
 * Function for saving user_state
 * Remembers the current state of conversation with the user
 * Apps Script cache is not too long, so it won't hold that info for too long - user can't wait a week between steps
 */
function save_user_state(id, user_state) {
  // Save user state to script properties
  PropertiesService.getScriptProperties().setProperty(id, JSON.stringify(user_state));
}

/** 
 * Function for getting keyboard options from a spreadsheet
 * Gets data from values_sheet
 */
function get_keyboard_options(range) {
  // Open the spreadsheet and retrieve values from the specified range
  var spreadsheet = SpreadsheetApp.openById(ss_id);
  var other_spreadsheet = spreadsheet.getSheetByName(values_sheet);
  var values = other_spreadsheet.getRange(range).getValues();

  // Extract the values from the 2D array and format them for the menu
  var keyboard_options = values.map(function (row) {
    return row[0].toString();
  });

  return keyboard_options;
}

/** 
 * Function for sending the user a specialized menu with pre-made answers
 * Simplifies the communication, saves time and standardizes the answers
 */
function send_menu(id, text, options) {
  var keyboard = options.map(function (option) {
    return [{ text: option }];
  });

  var payload = {
    method: 'sendMessage',
    chat_id: id,
    text: text,
    reply_markup: JSON.stringify({
      keyboard: keyboard,
      resize_keyboard: true,
      one_time_keyboard: true,
    }),
  };

  UrlFetchApp.fetch(url + '/sendMessage?chat_id=' + id, { method: 'post', payload: payload });
}

/** 
 * Main function for 'talking' to the user. Has to be called exactly 'doPost'
 */
function doPost(e) {
  var contents = JSON.parse(e.postData.contents);
  var id = contents.message.from.id;
  var username = contents.message.from.username;
  var text = contents.message.text;
  var document = contents.message.document;
  var photo = contents.message.photo;

  // Getting current conversation state with specific user
  var user_state = get_or_create_user_state(id);

  // Setting up the conversation steps
  var menus = [
    { question: '1. Choose the direction of funds movement:', variable: 'transaction_flow' },
    { question: '2. Choose the type of transaction:', range: ss_range_type, variable: 'transaction_type' },
    { question: '3. Choose the transaction currency:', range: ss_range_currency, variable: 'transaction_currency' },
    { question: '4. Choose the transaction wallet:', range: ss_range_wallet, variable: 'transaction_wallet' },
    { question: '5. Enter the transaction date (format: DD.MM.YYYY) or press the "Today" button:', range: ss_range_date, variable: 'transaction_date' },
    { question: '6. Enter the transfer amount:', variable: 'transaction_sum' },
    { question: '7. Enter the payment purpose:', variable: 'transaction_purpose' },
    { question: '8. Attach a transaction screenshot:', variable: 'photo_attachment' }
  ];

  // Check for conversation reset commands
  if (text === '/reset' || text === '/start') {
    user_state = {}; // Resetting user_state
    is_last_step = false; // Resetting the last_step variable
    send_menu(id, 'Clarifying parameters. Choose the direction of funds movement:', ['Income', 'Outcome']);

  } else {
    // If the converstion is not resetting - then we just continue:
    var current_step = user_state.current_step || 0;
    var current_menu = menus[current_step];

    if (current_menu) {
      if (current_step === menus.length - 1) {
        is_last_step = true; // Set the 'last_step' market
      }

      if (is_last_step && (document || photo)) {
        var file_id = document ? document.file_id : photo[photo.length - 1].file_id;
        var current_date = Utilities.formatDate(new Date(), gmt_var, 'MM-dd-yyyy\'T\'HH:mm:ss');
        var file_name = document ? document.file_name : 'Screenshot ' + current_date + ' ' + username;
        var saved = save_file_to_drive(file_id, file_name, folder_id);

        if (saved) {
          send_text(id, 'File saved to Google Drive. Saving data to spreadsheet...');
          // Checking if the user wrote 'today' as the date of transaction
          if (user_state.transaction_date === 'Today') {
            user_state.transaction_date = Utilities.formatDate(new Date(), gmt_var, 'dd.MM.yyyy');
          }
          // Checking if we need to invert the transaction value in the spreadsheet (for ease of further analysis)
          var operation_type = perform_vlookup(user_state.transaction_type, 2, 5, values_sheet);
          if (operation_type === 'Outcome') {
            if (user_state.transaction_sum > 0) {
              user_state.transaction_sum = -user_state.transaction_sum
            }
          }

          // Saving data to spreadsheet
          SpreadsheetApp.openById(ss_id).getSheetByName(bot_inputs_sheet).appendRow([new Date(), username, user_state.transaction_date, user_state.transaction_flow, user_state.transaction_type, user_state.transaction_currency, user_state.transaction_wallet, user_state.transaction_sum, user_state.transaction_purpose, file_name]); // Технический лист
          send_text(id, 'Data saved. Awaiting new commands.');

          // After the conversation if over - reset the flags
          user_state = {};
          is_last_step = false;
        } else {
          send_text(id, 'Error saving file to Google Drive.');
        }

        // End the whole function 
        return;
      }

      // Save the current user answer to a variable
      user_state[current_menu.variable] = text;

      // Moving on to the next step
      current_step++;
      user_state.current_step = current_step;

      // Ask the next question or pop a menu (if needed)
      current_menu = menus[current_step];
      if (current_menu.range) {
        // Second step is to be done like that due to Apps Script limitations to overwriting variables.
        // I know it's not perfect - but it gets the job done :)
        if (current_menu.variable === 'transaction_type' && (text === 'Income')) {
          send_menu(id, current_menu.question, get_keyboard_options(ss_range_income));
        } else if (current_menu.variable === 'transaction_type' && (text === 'Outcome')) {
          send_menu(id, current_menu.question, get_keyboard_options(ss_range_outcome));
        } else {
          send_menu(id, current_menu.question, get_keyboard_options(current_menu.range))
        }
      } else {
        send_text(id, current_menu.question);
      }
    }
  }

  // Save the current conversation state
  save_user_state(id, user_state);
}