import { TapToolsService } from './taptools';

interface TokenHolder {
    address: string;
    amount: number;
    value?: number;
    percentage?: number;
}

interface TokenTrade {
    action: string;
    address: string;
    exchange: string;
    hash: string;
    price: number;
    time: number;
    tokenAAmount: number;
    tokenAName: string;
    tokenBAmount: number;
    tokenBName: string;
}

export class WhaleWatcher {
    private tapTools: TapToolsService;

    constructor(apiKey: string) {
        this.tapTools = new TapToolsService(apiKey);
    }

    async getTrades(tokenUnit: string): Promise<TokenTrade[]> {
        try {
            console.log('\nFetching large trades from Taptools API...');
            console.log('Token Unit:', tokenUnit);
            
            // Get raw trades first to check what we're getting
            const rawTrades = await this.tapTools.getTokenTrades(tokenUnit, '1h', 1, 100);
            console.log('\n=== Raw Trades Before Processing ===');
            console.log('Number of raw trades:', rawTrades?.length);
            if (rawTrades?.length > 0) {
                // Log first few trades to check action distribution
                rawTrades.slice(0, 5).forEach((trade, i) => {
                    console.log(`\nRaw Trade ${i + 1}:`);
                    console.log('Action:', trade.action);
                    console.log('TokenA Amount:', trade.tokenAAmount);
                    console.log('TokenB Amount:', trade.tokenBAmount);
                });

                // Count buys vs sells in raw data
                const buyCount = rawTrades.filter(t => t.action === 'buy').length;
                const sellCount = rawTrades.filter(t => t.action === 'sell').length;
                console.log('\n=== Trade Distribution ===');
                console.log(`Total trades: ${rawTrades.length}`);
                console.log(`Buys: ${buyCount}`);
                console.log(`Sells: ${sellCount}`);
            }
            
            console.log('\n=== API Response Details ===');
            console.log('Response type:', typeof rawTrades);
            console.log('Is Array:', Array.isArray(rawTrades));
            
            if (!Array.isArray(rawTrades)) {
                console.error('Invalid trades response:', rawTrades);
                return [];
            }

            // Process trades - keeping the action from the API
            console.log('\n=== Processing Trades ===');
            const processedTrades = rawTrades.map((trade, index) => {
                console.log(`\nTrade ${index + 1}:`);
                console.log('Action from API:', trade.action);
                console.log('TokenA Amount:', trade.tokenAAmount);
                console.log('TokenA Name:', trade.tokenAName);
                console.log('TokenB Amount:', trade.tokenBAmount);
                console.log('TokenB Name:', trade.tokenBName);
                
                // Pass through the trade with its original action
                return trade;
            });

            // Log final distribution
            const finalBuys = processedTrades.filter(t => t.action === 'buy').length;
            const finalSells = processedTrades.filter(t => t.action === 'sell').length;
            console.log('\n=== Final Trade Distribution ===');
            console.log(`Total processed trades: ${processedTrades.length}`);
            console.log(`Final Buys: ${finalBuys}`);
            console.log(`Final Sells: ${finalSells}`);

            return processedTrades;
        } catch (error: any) {
            console.error('\n=== Error in getTrades ===');
            console.error('Error getting large trades:', error);
            if (error.response) {
                console.error('API Error Response:', error.response.data);
                console.error('Status:', error.response.status);
            }
            return [];
        }
    }

    async getTopHolders(tokenUnit: string): Promise<TokenHolder[]> {
        try {
            console.log('\nFetching top holders from Taptools API...');
            
            // Get top 50 holders
            const holders = await this.tapTools.getTopTokenHolders(tokenUnit, 1, 50);
            console.log('\nAPI Response - Top Holders:');
            console.log('Type:', typeof holders);
            console.log('Is Array:', Array.isArray(holders));
            console.log('Length:', holders?.length);
            console.log('First holder:', JSON.stringify(holders?.[0], null, 2));
            
            if (!Array.isArray(holders)) {
                console.error('Invalid holders response:', holders);
                return [];
            }

            // Get token price for value calculation
            const priceResponse = await this.tapTools.getTokenPrices([tokenUnit]);
            console.log('\nAPI Response - Token Price:');
            console.log('Price response:', JSON.stringify(priceResponse, null, 2));
            const tokenPrice = priceResponse?.[tokenUnit] || 0;
            console.log('Extracted price:', tokenPrice);

            // Get total supply for percentage calculation
            const supplyResponse = await this.tapTools.getTokenMcap(tokenUnit);
            console.log('\nAPI Response - Token Supply:');
            console.log('Supply response:', JSON.stringify(supplyResponse, null, 2));
            const totalSupply = supplyResponse?.totalSupply || 0;
            console.log('Extracted supply:', totalSupply);

            // Add value and percentage to each holder
            const processedHolders = holders.map(holder => {
                const value = holder.amount * tokenPrice;
                const percentage = totalSupply ? (holder.amount / totalSupply) * 100 : 0;
                console.log(`\nProcessing holder ${holder.address}:`);
                console.log('Amount:', holder.amount);
                console.log('Calculated value:', value);
                console.log('Calculated percentage:', percentage);
                return {
                    ...holder,
                    value,
                    percentage
                };
            }).sort((a, b) => (b.value || 0) - (a.value || 0));

            return processedHolders;

        } catch (error: any) {
            console.error('Error getting top holders:', error);
            if (error.response) {
                console.error('API Error Response:', error.response.data);
                console.error('Status:', error.response.status);
            }
            return [];
        }
    }
}
