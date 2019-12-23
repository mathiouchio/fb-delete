const inquirer = require("inquirer");
const date = require("./date");

const {
  EMAIL,
  PASSWORD,
  CATEGORIES,
  YEARS,
  DRYRUN,
  VISUAL,
  DEBUG
} = process.env;
const { currentYear } = date;

const years = [];
for (let i = 2004; i <= currentYear; i++) {
  years.push(i.toString());
}
years.reverse();

const categories = [
  "Posts",
  "Posts You're Tagged In",
  "Photos and Videos",
  "Photos You're Tagged In",
  "Others' Posts To Your Timeline",
  "Hidden From Timeline",
  "Likes and Reactions",
  "Comments",
  "Profile",
  "Life Events",
  "Songs You've Listened To",
  "Articles You've Read",
  "Movies and TV",
  "Games",
  "Books",
  "Products You Wanted",
  "Notes about others",
  "Videos You've Watched",
  "Following",
  "Groups",
  "Events",
  "Polls",
  "Search History",
  "Saved",
  "Apps",
  "Pokes"
];

const questions = [
  {
    type: "input",
    name: "username",
    message: "Please enter your Facebook username (email address):"
  },
  {
    type: "password",
    message: "Please enter your Facebook password:",
    name: "password",
    mask: "*"
  },
  {
    type: "checkbox",
    name: "categories",
    message: "Select the categories you'd like to delete:",
    paginated: false,
    choices: categories
  },
  {
    type: "checkbox",
    name: "years",
    message: "Select the years you'd like to delete:",
    paginated: false,
    choices: years
  },
  {
    type: "confirm",
    name: "dryRun",
    message: "Test and count what to delete:",
    default: false
  },
  {
    type: "confirm",
    name: "visual",
    message: "Delete with visual:",
    default: false
  }
];

let answers = {};

if (EMAIL) questions.shift();
if (PASSWORD) questions.shift();
if (CATEGORIES) questions.shift();
if (YEARS) questions.shift();
if (DRYRUN) questions.shift();
if (VISUAL) questions.shift();

async function prompt() {
  answers = await inquirer.prompt(questions);

  if (EMAIL) answers.username = EMAIL;
  if (PASSWORD) answers.password = PASSWORD;
  if (CATEGORIES) answers.categories = CATEGORIES.split(",");
  if (YEARS) answers.years = YEARS.split(",");
  if (DRYRUN) answers.dryRun = DRYRUN === "true";
  if (VISUAL) answers.visual = VISUAL === "true";
  if (DEBUG === "true") console.log(answers);

  return answers;
}

module.exports = prompt;
