$( document ).ready( function() {
	//need to implement a global stack for cell processing because apparently javascript has trouble with recursive function calls
	//it's a little slow at larger sizes, maybe due to the push() function call overhead?
	$.gameParams = {
		lostGame : false,
		rows : 8,
		cols : 8,
		mines : 10,
		cellStack : []
	};

	//attach click handlers to controls
	$( '#new-game-button' ).click( function() {
		$( 'table' ).loadNewGame( $.gameParams.rows, $.gameParams.cols, $.gameParams.mines );
	});
	
	$( '#validate-button' ).click( function() {
		$( 'table' ).validate();
	});
	
	$( '#settings-button' ).click( function() {
		$( '#settings-modal' ).modal();
	});
	
	$( '#cheat-button' ).click( function() {
		$( 'table' ).cheat();
	});
	
	//attach submit handler to settings form
	$( '#settings-form' ).submit( function() {
		$( 'table' ).changeSettings();
		return false;
	});
	
	//initialize first game with default values
	$( 'table' ).loadNewGame( $.gameParams.rows, $.gameParams.cols, $.gameParams.mines );
});

//processes a cell to either explode a mine or display # of neighboring mines.
//if there are zero neighboring mines, adds neighboring cells to global stack to be post-processed.
//called on jquery object containing a single cell
jQuery.fn.checkCell = function( totalRows, totalCols ) {
	console.time( 'checkCell' );
	var currentCell = $( this );
	if( currentCell.hasClass( 'cell-danger' ) )
	{
		//found a mine!
		$( 'table' ).loseGame( this );
	}
	else
	{
		//no mine here.
		//get coordinates from HTML5 data attrs
		var row = currentCell.data( 'row' );
		var col = currentCell.data( 'col' );
		
		//make sure we don't go off the edge of the grid when we check for mines
		var rLowerBound = (( row == 0 ) ? row : ( row - 1 ));
		var rUpperBound = (( row == totalRows - 1 ) ? row : ( row + 1 ));
		var cLowerBound = (( col == 0 ) ? col : ( col - 1 ));
		var cUpperBound = (( col == totalCols - 1 ) ? col : ( col + 1 ));
		
		//check local cells for mines
		var minesFound = 0;
		for( i = rLowerBound; i <= rUpperBound; i++ )
		{
			for( j = cLowerBound; j <= cUpperBound; j++ )
			{
				var targetCell = '#cell-row-' + i + '-col-' + j;
				var targetCellObj = $( targetCell );
				if( targetCellObj.is( '.cell-hidden.cell-danger' ) )
				{
					minesFound = minesFound + 1;
				}
			}
		}
		
		//add surrounding hidden cells to stack if no mines were found (to be processed in next part of click handler)
		if( minesFound == 0 )
		{
			for( i = rLowerBound; i <= rUpperBound; i++ )
			{
				for( j = cLowerBound; j <= cUpperBound; j++ )
				{
					var targetCell = '#cell-row-' + i + '-col-' + j;
					var targetCellObj = $( targetCell );
					if( targetCellObj.hasClass( 'cell-hidden' ) )
					{
						//push cell coordinates to stack
						$.gameParams.cellStack.push( targetCellObj );
						
						//mark cell as revealed (prevents duplicate pushes of same cell)
						targetCellObj.removeClass( 'cell-hidden' );
						
						//remove click handler
						targetCellObj.off( 'click' );
					}
				}
			}
		}
		else
		{
			//display number of found mines
			currentCell.text( minesFound.toString() );
		}
		console.timeEnd( 'checkCell' );
	}
};

//processes the global stack of queued cells
jQuery.fn.processCellStack = function() {
	console.time( 'processCellStack' );
	while( $.gameParams.cellStack.length > 0 )
	{
		var c = $.gameParams.cellStack.pop();
		c.checkCell( $.gameParams.rows, $.gameParams.cols );
	}
	console.timeEnd( 'processCellStack' );
};

//checks number of hidden cells to see if all safe cells have been revealed, and if all mined cells are still hidden.  if so, user has won!
jQuery.fn.validate = function() {
	//ensure we are still playing
	if( !( $.gameParams.lostGame ) )
	{
		if( $( '.cell-hidden' ).length > $.gameParams.mines )
		{
			//there are still-unrevealed safe cells. we're done here
			$( '#message' ).text( 'You ain\'t done yet! Keep going!' );
			return false;
		}
		else
		{
			//user wins!
			$( '#message' ).text( 'You win! *brofist*' );
			
			//show locations of other mines if not revealed already
			$( '.cell-danger', 'table' ).addClass( 'debug' );
			$( '.debug', 'table' ).css( 'background-color', 'greenYellow' );
		
			//disable click handlers on all cells so you can't keep playing
			$( '.cell' ).off( 'click' );
		}
	}
};

//allows user to change settings (size of table, # of mines). called upon submission of settings HTML form
jQuery.fn.changeSettings = function() {
	//change global variables to user-defined ones
	$.gameParams.rows = $( 'input:radio[name=selectSize]:checked' ).val();
	$.gameParams.cols = $( 'input:radio[name=selectSize]:checked' ).val();
	$.gameParams.mines = $( 'input:radio[name=selectMines]:checked' ).val();
	
	//close modal
	$( '#settings-modal' ).modal( 'hide' );
	
	//start new game with new settings
	$( 'table' ).loadNewGame( $.gameParams.rows, $.gameParams.cols, $.gameParams.mines );
};

//function triggered when user clicks on a cell (attached at initialization of board to hidden cells, removed when they are revealed)
//disables the cell and marks it as revealed, then calls checkCell to process it and update the game state
jQuery.fn.cellClickHandler = function( cell ) {
	var cellObj = $( cell );
	//mark cell as clicked (remove class and click handler)
	cellObj.removeClass( 'cell-hidden' );
	cellObj.off( 'click' );
	
	//process cell
	cellObj.checkCell( $.gameParams.rows, $.gameParams.cols );
	
	//process stack in case the clicked cell added any
	$( 'table' ).processCellStack();
};

//reveals location of mines
jQuery.fn.cheat = function() {
	$( '.cell-danger', 'table' ).addClass( 'debug' );
};

//a mine has been found! ends the game
jQuery.fn.loseGame = function( clickedCell ) {
	$( '#message' ).text( 'Oh no you lose!' );
	
	$.gameParams.lostGame = true;

	//replace exploding cell with skull
	$( clickedCell ).removeClass( 'cell-danger' ).addClass( 'cell-kaboom' );
	
	//show locations of other mines
	$( '.cell-danger', 'table' ).addClass( 'debug' );
	
	//disable click handlers on all cells so you can't keep playing
	$( '.cell' ).off( 'click' );
};

//begins a new game with the specified dimensions
//called on a $( 'table' ) object
jQuery.fn.loadNewGame = function( numRows, numCols, numMines ) {
	console.time( 'loadNewGame' );
	tableObj = $( this );
	//erase old state
	$( '#message' ).html('');
	$.gameParams.lostGame = false;
	$.gameParams.cellStack = [];
	
	//erase old board
	tableObj.empty();
	
	//add html for table rows and cols (faster to do it in a string first)
	//need to store row and col in class and in HTML5 data attrs so we can both place the mines now and do math later when we check hidden cells
	var tableHtml = '';
	for( i=0; i < numRows; i++ )
	{
		tableHtml += '<tr>';
		for( j=0; j < numCols; j++ )
		{
			var cellString = '<td class="cell cell-hidden" id="cell-row-' + i + '-col-' + j + '" data-row="' + i + '" data-col="' + j + '"></td>';
			tableHtml += cellString;
		}
		tableHtml += '</tr>';
	}
	this.append( tableHtml );
	
	//randomly generate coordinates for mined cells and add DANGERCLASS
	//do it in a while loop instead of a for loop to avoid issues with duplicate coordinates
	var minesPlaced = 0;
	while( minesPlaced < numMines )
	{
		var r = Math.floor( Math.random() * numRows );
		var c = Math.floor( Math.random() * numCols );
		var targetCell = '#cell-row-' + r + '-col-' + c;
		var targetCellObj = $( targetCell );
		if( !targetCellObj.hasClass( 'cell-danger' ) )
		{
			targetCellObj.addClass( 'cell-danger' );
			minesPlaced = minesPlaced + 1;
		}
	}
	
	//attach click handlers to cells
	$( '.cell-hidden' ).click( function() {
		$().cellClickHandler( this );
	});
	
	//center control buttons because I'm a little OCD
	$( 'button.gameButton' ).each( function( i ) {
		var btnWidth = $( this ).outerWidth();
		var wrapperWidth = $( '.gameControl' ).width();
		$( this ).css( 'margin-left', function( i, v ) {
			return parseFloat( ( wrapperWidth - btnWidth ) / 2 );
		});
	});
	console.timeEnd( 'loadNewGame' );
};