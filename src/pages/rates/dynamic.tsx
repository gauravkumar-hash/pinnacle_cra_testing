import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message, Card, Spin, Alert } from "antd";
import DynamicRatesTimeSelection from "@/components/DynamicRatesTimeSelection";
import { ContentView } from "@/components/Content";
import {
    getDynamicRatesApiAdminRatesGet,
    upsertDynamicRatesApiAdminRatesPost,
    deleteDynamicRatesApiAdminRatesIdDelete,
    ApiError,
    DynamicPricingRow,
    InventoryItemInfo
} from "@/services/client";
import { getErrorMsg } from "@/utils";

// Extended type to include corporate_code_override_details from backend
// (Backend returns this but generated types may not be updated yet)
interface CorporateCodeOverrideInfo {
    corporate_code_id: string;
    inventory_item_ids: string[];
    inventory_items: InventoryItemInfo[];
}

interface ExtendedDynamicPricingRow extends DynamicPricingRow {
    corporate_code_override_details?: CorporateCodeOverrideInfo[];
}

interface TimeInterval {
    id: string;
    start: number;
    end: number;
    amount?: number;
    inventoryItem?: InventoryItemInfo;
    publicRateItems?: InventoryItemInfo[];
    corporateCodeOverrides?: Array<{
        corporateCodeId: string;
        inventoryItems: InventoryItemInfo[];
    }>;
}

interface RateConfig {
    [key: string]: TimeInterval[];
}

const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const parseTime = (timeStr: string): number => {
    // Handle different time formats
    if (timeStr.includes(':')) {
        // Handle "HH:MM:SS" or "HH:MM" format from backend
        const parts = timeStr.split(':');
        const hour = parseInt(parts[0]);
        const minute = parseInt(parts[1]);
        return hour * 60 + minute;
    } else {
        // Handle "HHMM" format
        if (timeStr === "2400") {
            return 23 * 60 + 59;
        }
        const hour = parseInt(timeStr.substring(0, 2));
        const minute = parseInt(timeStr.substring(2, 4));
        return hour * 60 + minute;
    }
};

export function DynamicRatesScreen() {
    const [initialRates, setInitialRates] = useState<RateConfig | null>(null);
    const [, setPendingChanges] = useState<Map<string, DynamicPricingRow>>(new Map());
    const queryClient = useQueryClient();

    const { data: ratesData, isLoading } = useQuery({
        queryKey: ['dynamic_rates'],
        queryFn: getDynamicRatesApiAdminRatesGet,
    });

    // Convert backend data to TimeSelection format when data loads
    useEffect(() => {
        if (ratesData) {
            const converted: RateConfig = {
                'MON-FRI': [],
                'SAT': [],
                'SUN': [],
                'PH': []
            };

            ratesData.rates.forEach((rate) => {
                if (converted[rate.date]) {
                    // Cast to extended type to access corporate_code_override_details
                    const extendedRate = rate as ExtendedDynamicPricingRow;

                    // Convert corporate code overrides from backend format to frontend format
                    const corporateCodeOverrides = extendedRate.corporate_code_override_details?.map(
                        (override) => ({
                            corporateCodeId: override.corporate_code_id,
                            inventoryItems: override.inventory_items
                        })
                    );

                    const timeInterval: TimeInterval = {
                        id: rate.id || `${rate.date}-${rate.start_time}-${rate.end_time}`,
                        start: parseTime(rate.start_time),
                        end: parseTime(rate.end_time),
                        amount: rate.amount,
                        // Set public rate items from the API response
                        publicRateItems: rate.inventory_items && rate.inventory_items.length > 0 ? rate.inventory_items : undefined,
                        // Set corporate code overrides from the API response
                        corporateCodeOverrides: corporateCodeOverrides && corporateCodeOverrides.length > 0 ? corporateCodeOverrides : undefined
                    };

                    converted[rate.date].push(timeInterval);
                }
            });

            // Sort intervals by start time
            Object.keys(converted).forEach(day => {
                converted[day].sort((a, b) => a.start - b.start);
            });

            setInitialRates(converted);
        }
    }, [ratesData]);

    const saveMutation = useMutation({
        mutationFn: upsertDynamicRatesApiAdminRatesPost,
        onSuccess: () => {
            message.success('Dynamic rate saved successfully');
            queryClient.invalidateQueries({ queryKey: ['dynamic_rates'] });
            // Reset to force reload from server
            setInitialRates(null);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDynamicRatesApiAdminRatesIdDelete,
        onSuccess: () => {
            message.success('Dynamic rate deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['dynamic_rates'] });
            // Reset to force reload from server
            setInitialRates(null);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    });

    const handleIntervalUpdate = async (day: string, interval: TimeInterval) => {
        // Check if we have either public rate items or legacy inventory item
        const hasPublicRates = interval.publicRateItems && interval.publicRateItems.length > 0;
        const hasLegacyRate = interval.inventoryItem && interval.inventoryItem.price;

        if (!hasPublicRates && !hasLegacyRate) {
            message.error('Please select at least one service item (either public rate or legacy rate)');
            return;
        }

        // Calculate amount and item references
        let amount: number;
        let inventory_item_ids: string[];

        if (hasPublicRates) {
            // Use total price of all public rate items
            amount = interval.publicRateItems!.reduce((sum, item) => sum + (item.price || 0), 0);
            inventory_item_ids = interval.publicRateItems!.map(item => item.id);
        } else {
            // Use legacy inventory item
            amount = interval.inventoryItem!.price!;
            inventory_item_ids = [interval.inventoryItem!.id];
        }

        // Convert corporate code overrides to backend format: { corporateCodeId: [inventoryItemIds] }
        const corporate_code_overrides: { [key: string]: string[] } = {};
        if (interval.corporateCodeOverrides && interval.corporateCodeOverrides.length > 0) {
            interval.corporateCodeOverrides.forEach(override => {
                corporate_code_overrides[override.corporateCodeId] = override.inventoryItems.map(item => item.id);
            });
        }

        const requestBody = {
            id: interval.id.startsWith(`${day}-`) ? undefined : interval.id,
            date: day,
            start_time: formatTime(interval.start),
            end_time: formatTime(interval.end),
            amount: amount,
            inventory_item_ids: inventory_item_ids,
            corporate_code_overrides: corporate_code_overrides
        };

        // Store in pending changes
        setPendingChanges(prev => {
            const newMap = new Map(prev);
            newMap.set(`${day}-${interval.id}`, requestBody as any);
            return newMap;
        });

        // Save immediately
        await saveMutation.mutateAsync({ requestBody: requestBody as DynamicPricingRow });

        // Explicitly invalidate queries to ensure data refresh
        queryClient.invalidateQueries({ queryKey: ['dynamic_rates'] });
    };

    const handleIntervalDelete = async (day: string, interval: TimeInterval) => {
        // Only delete from backend if it's an existing record (has a proper ID)
        if (interval.id && !interval.id.startsWith(`${day}-`)) {
            try {
                await deleteMutation.mutateAsync({ id: parseInt(interval.id) });
                queryClient.invalidateQueries({ queryKey: ['dynamic_rates'] });
                setInitialRates(null);
            } catch (error) {
                // Error already handled by mutation's onError
            }
        }
    };

    if (isLoading || !initialRates) {
        return (
            <ContentView title="Configure Dynamic Rates">
                <div className="flex justify-center items-center h-64">
                    <Spin size="large" />
                </div>
            </ContentView>
        );
    }

    return (
        <ContentView title="Configure Dynamic Rates">
            <Card>
                <DynamicRatesTimeSelection
                    initialRates={initialRates}
                    onIntervalUpdate={handleIntervalUpdate}
                    onIntervalDelete={handleIntervalDelete}
                    loading={saveMutation.isPending || deleteMutation.isPending}
                />

                {ratesData?.errors && ratesData.errors.length > 0 && (
                    <Alert
                        className="mt-4"
                        message="Configuration Issues"
                        description={
                            <ul className="mt-2">
                                {ratesData.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        }
                        type="warning"
                        showIcon
                    />
                )}
            </Card>
        </ContentView>
    );
}