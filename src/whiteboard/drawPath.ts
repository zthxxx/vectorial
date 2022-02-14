import paper, { view, Path, Point, Color } from 'paper'


export const drawPath = () => {
  	// Create a Paper.js Path to draw a line into it:
		var path = new Path();
		// Give the stroke a color
		path.strokeColor = new Color('black');
		var start = new Point(100, 100);
		// Move to start and draw a line from there
		path.moveTo(start);
		// Note that the plus operator on Point objects does not work
		// in JavaScript. Instead, we need to call the add() function:
		path.lineTo(start.add(new Point(200, -50)));
		// Draw the view now:
		// view.draw();
} 