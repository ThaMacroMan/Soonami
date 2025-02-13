import dotenv from 'dotenv';
import { WhaleWatcher } from './algos';
import tokenList from './data/token_list.json';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function displayTokenList() {
    console.log('\nAvailable Tokens:');
    console.log('----------------------------------------');
    tokenList.tokens.forEach((token, index) => {
        console.log(`${index + 1}. ${token.ticker.padEnd(10)} | Price: $${token.price.toFixed(6).padEnd(12)} | Liquidity: $${token.liquidity.toLocaleString()}`);
    });
}

function promptForToken(): Promise<string> {
    return new Promise((resolve) => {
        displayTokenList();
        rl.question('\nEnter the number of the token you want to analyze (1-' + tokenList.tokens.length + '): ', (answer) => {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < tokenList.tokens.length) {
                resolve(tokenList.tokens[index].unit);
            } else {
                console.log('Invalid selection. Please try again.');
                resolve(promptForToken());
            }
        });
    });
}

function displayHolder(holder: any, index: number, ticker: string) {
    console.log('\n' + '-'.repeat(100));
    console.log(`#${index + 1} TOP HOLDER (${holder.percentage?.toFixed(2) || '0.00'}% of supply)`);
    console.log(`Address: ${holder.address || 'Unknown'}`);
    console.log(`Holdings: ${(holder.amount || 0).toLocaleString()} ${ticker}`);
    console.log(`Value: $${(holder.value || 0).toLocaleString()}`);
}

function displayTrade(trade: any, index: number) {
    const date = new Date((trade.time || 0) * 1000).toLocaleString();
    const action = (trade.action || 'UNKNOWN').toUpperCase();
    
    // For buys, we show tokenA (the token being bought)
    // For sells, we show tokenB (ADA amount)
    const isTokenAmount = trade.action === 'buy' ? trade.tokenAAmount : trade.tokenBAmount;
    const tokenName = trade.action === 'buy' ? trade.tokenAName : trade.tokenBName;
    const amount = (isTokenAmount || 0).toLocaleString();
    
    // Calculate the total value in ADA
    const adaValue = trade.action === 'buy' ? trade.tokenBAmount : trade.tokenAAmount;
    const price = trade.price || 0;
    
    console.log('\n' + '-'.repeat(100));
    console.log(`#${index + 1} LARGE TRADE`);
    console.log(`Time: ${date}`);
    console.log(`Action: ${action}`);
    console.log(`Address: ${trade.address || 'Unknown'}`);
    console.log(`Amount: ${amount} ${tokenName}`);
    console.log(`Price: $${price.toLocaleString()}`);
    console.log(`Value: ${adaValue.toLocaleString()} ADA`);
    console.log(`Exchange: ${trade.exchange || 'Unknown'}`);
    console.log(`Transaction: ${trade.hash || 'Unknown'}`);
}

async function main() {
    // Get API key from environment variables
    const apiKey = process.env.TAPTOOLS_API_KEY;
    if (!apiKey) {
        console.error('Please set TAPTOOLS_API_KEY in your .env file');
        process.exit(1);
    }

    // Initialize whale watcher
    const whaleWatcher = new WhaleWatcher(apiKey);

    try {
        // Get token selection from user
        const selectedUnit = await promptForToken();
        const selectedToken = tokenList.tokens.find(t => t.unit === selectedUnit)!;
        
        console.log(`\nAnalyzing top holders for ${selectedToken.ticker} (${selectedUnit})`);
        console.log('='.repeat(100));

        // Get top holders
        const holders = await whaleWatcher.getTopHolders(selectedUnit);
        
        if (holders.length === 0) {
            console.log('\nNo holders found for this token.');
        } else {
            const totalValue = holders.reduce((sum, h) => sum + (h.value || 0), 0);
            const totalPercentage = holders.reduce((sum, h) => sum + (h.percentage || 0), 0);

            console.log('\nTOP HOLDERS SUMMARY');
            console.log('-'.repeat(50));
            console.log(`Number of Top Holders: ${holders.length}`);
            console.log(`Total Holdings Value: $${totalValue.toLocaleString()}`);
            console.log(`Total Supply Percentage: ${totalPercentage.toFixed(2)}%`);
            console.log(`Average Position: $${(totalValue / holders.length).toLocaleString()}`);

            console.log('\nTOP HOLDERS LIST');
            holders.forEach((holder, index) => {
                displayHolder(holder, index, selectedToken.ticker);
            });

            // Get and display large trades
            console.log('\n\nLARGE TRADES (>10,000 ADA in last 7 days)');
            console.log('='.repeat(100));
            
            const trades = await whaleWatcher.getLargeTrades(selectedUnit);
            
            if (trades.length === 0) {
                console.log('\nNo large trades found in the last 7 days.');
            } else {
                console.log(`\nFound ${trades.length} large trades`);
                trades.forEach((trade, index) => {
                    displayTrade(trade, index);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        rl.close();
    }
}

main(); 