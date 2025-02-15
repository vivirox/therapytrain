import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { DatabaseMonitoringService } from '../services/DatabaseMonitoringService';
import { OptimizedDatabaseService } from '../services/OptimizedDatabaseService';

const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const monitoringService = DatabaseMonitoringService.getInstance(supabase);
const dbService = OptimizedDatabaseService.getInstance(supabase);

interface IndexRecommendation {
    table_name: string;
    column_names: string[];
    index_type: string;
    reason: string;
    estimated_improvement: number;
}

async function analyzeAndOptimizeIndexes() {
    try {
        console.log('Analyzing current index usage...');
        const { data: unusedIndexes } = await supabase
            .rpc('get_index_usage_stats');
        
        if (unusedIndexes && unusedIndexes.length > 0) {
            console.log('\nUnused indexes found:');
            unusedIndexes.forEach(idx => {
                console.log(`- ${idx.indexname} on ${idx.tablename}`);
            });
        }

        console.log('\nGetting index recommendations...');
        const { data: currentRecommendations } = await supabase
            .from('index_advisor.recommendations')
            .select('*')
            .eq('is_implemented', false)
            .order('estimated_improvement', { ascending: false });

        if (!currentRecommendations || currentRecommendations.length === 0) {
            console.log('No new index recommendations found.');
            
            console.log('\nGenerating new recommendations...');
            const { data: newRecommendations } = await supabase
                .rpc('index_advisor.recommend_indexes');

            if (newRecommendations && newRecommendations.length > 0) {
                console.log('\nNew recommendations found:');
                for (const rec of newRecommendations) {
                    await supabase
                        .from('index_advisor.recommendations')
                        .insert({
                            table_name: rec.table_name,
                            column_names: rec.column_names,
                            index_type: rec.index_type,
                            reason: rec.reason,
                            estimated_improvement: rec.estimated_improvement
                        });
                }
            }
        }

        // Get all pending recommendations
        const { data: pendingRecommendations } = await supabase
            .from('index_advisor.recommendations')
            .select('*')
            .eq('is_implemented', false)
            .order('estimated_improvement', { ascending: false });

        if (pendingRecommendations && pendingRecommendations.length > 0) {
            console.log('\nImplementing recommended indexes...');
            
            for (const rec of pendingRecommendations) {
                console.log(`\nAnalyzing recommendation for ${rec.table_name}...`);
                console.log(`Columns: ${rec.column_names.join(', ')}`);
                console.log(`Reason: ${rec.reason}`);
                console.log(`Estimated improvement: ${rec.estimated_improvement}x`);

                // Analyze the impact using hypopg
                const { data: hypotheticalAnalysis } = await supabase
                    .rpc('analyze_hypothetical_index', {
                        p_table_name: rec.table_name,
                        p_column_names: rec.column_names,
                        p_index_type: rec.index_type
                    });

                if (hypotheticalAnalysis && hypotheticalAnalysis.improvement_factor > 1.5) {
                    console.log(`Implementing index for ${rec.table_name}...`);
                    const { data: result } = await supabase
                        .rpc('index_advisor.implement_index', {
                            p_table_name: rec.table_name,
                            p_column_names: rec.column_names,
                            p_index_type: rec.index_type
                        });

                    console.log(result);
                } else {
                    console.log('Skipping implementation due to insufficient improvement');
                    // Mark as implemented but add a note
                    await supabase
                        .from('index_advisor.recommendations')
                        .update({
                            is_implemented: true,
                            implemented_at: new Date().toISOString(),
                            reason: rec.reason + ' (Skipped: insufficient improvement)'
                        })
                        .eq('id', rec.id);
                }
            }
        }

        // Analyze the results
        console.log('\nAnalyzing results...');
        const performanceReport = monitoringService.generatePerformanceReport();
        console.log('\nPerformance Report:', performanceReport);

        // Get updated optimization suggestions
        const optimizationSuggestions = monitoringService.getOptimizationRecommendations();
        console.log('\nRemaining Optimization Recommendations:', optimizationSuggestions);

    } catch (error) {
        console.error('Error optimizing indexes:', error);
    }
}

// Function to analyze hypothetical index impact
async function analyzeHypotheticalIndex(
    tableName: string,
    columnNames: string[],
    indexType: string = 'btree'
): Promise<number> {
    try {
        // Create hypothetical index
        await supabase.rpc('hypopg_create_index', {
            p_table: tableName,
            p_columns: columnNames,
            p_index_type: indexType
        });

        // Analyze queries with hypothetical index
        const { data: analysis } = await supabase.rpc('analyze_query_plans');
        
        // Reset hypothetical indexes
        await supabase.rpc('hypopg_reset');

        return analysis?.improvement_factor || 0;
    } catch (error) {
        console.error('Error analyzing hypothetical index:', error);
        return 0;
    }
}

// Run the optimization
console.log('Starting index optimization...');
analyzeAndOptimizeIndexes()
    .then(() => console.log('Index optimization completed'))
    .catch(error => console.error('Error:', error)); 