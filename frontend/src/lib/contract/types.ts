
export interface Policy{
    policy_id: string
    pool_id: string
    farmer: string
    premium_paid: number
    coverage_amount: number
    active: boolean
    claimed: boolean
    joined_at: string
}


export interface WeatherReading{
    day: string
    soil_moisture: string
    drought_index: "normal" | "watch" | "warning" | "severe"     
    recorded_at: string
    recorded_by: string

}



export interface PayoutRecord{
    payout_id: string
    pool_id: string
    farmer: string
    amount: number
    trigger_reason: string
    paid_at: string

}

export interface Pool{
    pool_id: string
    name: string
    description: string
    region_name: string
    latitude: string
    longitude: string         
    radius_km: string          
    drought_threshold: string 
    consecutive_days_required: number
    premium_per_policy: number
    coverage_per_policy: number
    max_policies: number
    total_policies: number
    vault_balance: number
    status: "open" | "active" | "triggered" | "closed"        
    created_at: string
    created_by: string
    trigger_activated_at: string
    policy_ids: string[]
    reading_days: string[]
    season_end: number
}

export interface TransactionReceipt {
    status: string;
    hash: string;
    blockNumber?: number;
    [key: string]: any;
}



export type FilterType = 'All' | 'Open' | 'Active' | 'Triggered' | 'Closed';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
