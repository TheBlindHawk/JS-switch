# JS-switch
A very simple and easy to use switch-case parser

## examples
```javascript
switch (animal) {
  'dog', 'puppy': console.log('barks');
  'cat', 'kitten': console.log('meows');
  'wolf': console.log('howls');
  default: console.log('silence');
}
```
The break is added as a default.
Here is an example if you don't want to break (example taken from MDN):
```javascript
switch (foo) {
  case 0:> output += "So ";
  case 1:> output += "What Is";
  case 2:> output += "Your ";
  case 3:> output += "Name";
  case 4: console.log(output+"?");
  default: console.log("Please pick a number from 0 to 5!");
}
```

## Outro
Here is a post explaining why I decided to try and write this code.
[zenn.dev/theblindhawk](https://zenn.dev/theblindhawk/articles/f3633b0524fb91)
Please feel free to open pull requests/issues to improve the parser, any help would be appreciated!
