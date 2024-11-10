// ---------------------------------------------- NOTES

/*
[option + shift + f] = format
*/

// ---------------------------------------------- SET-UP

import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;

// ---------------------------------------------- CONTENT

const button = document.createElement("button");
button.innerHTML = "click me!";
app.append(button);

button.addEventListener("click", () => {
  alert("hello");
});
