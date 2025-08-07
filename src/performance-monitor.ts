/**
 * Simple performance monitoring utilities
 * Helps track startup and operation performance
 */

interface PerformanceMetric {
    name: string;
    startTime: number;
    duration?: number;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private enabled: boolean = false; // Set to true for debugging

    /**
     * Enable or disable performance monitoring
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Start timing a metric
     */
    start(name: string): void {
        if (!this.enabled) return;

        this.metrics.set(name, {
            name,
            startTime: performance.now()
        });
    }

    /**
     * End timing a metric and calculate duration
     */
    end(name: string): number | null {
        if (!this.enabled) return null;

        const metric = this.metrics.get(name);
        if (!metric) return null;

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        metric.duration = duration;
        return duration;
    }

    /**
     * Get all metrics
     */
    getMetrics(): PerformanceMetric[] {
        if (!this.enabled) return [];
        return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * Log all metrics to console
     */
    logMetrics(): void {
        if (!this.enabled) return;

        const metrics = this.getMetrics();
        if (metrics.length === 0) return;

        console.group('🚀 Emoji Selector Performance Metrics');
        metrics.forEach(metric => {
            console.log(`${metric.name}: ${metric.duration!.toFixed(2)}ms`);
        });
        console.groupEnd();
    }

    /**
     * Get a specific metric
     */
    getMetric(name: string): PerformanceMetric | undefined {
        return this.metrics.get(name);
    }

    /**
     * Check if monitoring is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

// Enable in development
if (process.env.NODE_ENV === 'development') {
    perfMonitor.setEnabled(true);
}