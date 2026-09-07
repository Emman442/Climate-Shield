# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass


# ─── Data Structures ──────────────────────────────────────────

@allow_storage
@dataclass
class Policy:
    policy_id: str
    pool_id: str
    farmer: str
    premium_paid: i32
    coverage_amount: i32
    active: bool
    claimed: bool
    joined_at: str


@allow_storage
@dataclass
class WeatherReading:
    day: str                # ISO date string e.g. "2026-07-09"
    soil_moisture: str      # raw value as string e.g. "0.12"
    drought_index: str      # "normal" | "watch" | "warning" | "severe"
    recorded_at: str
    recorded_by: str


@allow_storage
@dataclass
class PayoutRecord:
    payout_id: str
    pool_id: str
    farmer: str
    amount: i32
    trigger_reason: str
    paid_at: str


@allow_storage
@dataclass
class Pool:
    pool_id: str
    name: str
    description: str
    region_name: str
    latitude: str           # stored as string e.g. "9.0572"
    longitude: str          # stored as string e.g. "7.4898"
    radius_km: str          # coverage radius in km
    drought_threshold: str  # soil moisture below this triggers payout e.g. "0.15"
    consecutive_days_required: i32  # days below threshold to trigger
    premium_per_policy: i32
    coverage_per_policy: i32
    max_policies: i32
    total_policies: i32
    vault_balance: i32
    status: str             # "open" | "active" | "triggered" | "closed"
    created_at: str
    created_by: str
    trigger_activated_at: str
    policy_ids: DynArray[str]
    reading_days: DynArray[str]  # ordered list of recorded day strings
    season_end: i64


class ClimateShield(gl.Contract):

    # Pools — each pool covers a geographic region
    pools: TreeMap[str, Pool]
    pool_ids: DynArray[str]
    pool_counter: i32

    # Policies — keyed by policy_id
    policies: TreeMap[str, Policy]
    policy_counter: i32

    # Weather readings — keyed by pool_id + "|" + day
    readings: TreeMap[str, WeatherReading]

    # Payout records — keyed by payout_id
    payouts: TreeMap[str, PayoutRecord]
    payout_counter: i32

    # Track if a farmer already has a policy in a pool
    # keyed by pool_id + "|" + wallet
    farmer_pool_policy: TreeMap[str, str]

    # Admin
    admin: str

    def __init__(self, admin_address: str):
        self.admin = admin_address
        self.pool_counter = i32(0)
        self.policy_counter = i32(0)
        self.payout_counter = i32(0)

    # ─── Helpers ──────────────────────────────────────────────

    def _only_admin(self) -> None:
        assert str(gl.message.sender_address) == self.admin, "Only admin"

    def _reading_key(self, pool_id: str, day: str) -> str:
        return pool_id + "|" + day

    def _farmer_pool_key(self, pool_id: str, wallet: str) -> str:
        return pool_id + "|" + wallet

    def _classify_drought(self, moisture: float, threshold: float) -> str:
        if moisture >= threshold:
            return "normal"
        ratio = moisture / threshold
        if ratio >= 0.75:
            return "watch"
        elif ratio >= 0.50:
            return "warning"
        else:
            return "severe"

    # ─── Pool Creation (Admin) ────────────────────────────────

    @gl.public.write
    def create_pool(
        self,
        name: str,
        description: str,
        region_name: str,
        latitude: str,
        longitude: str,
        radius_km: str,
        drought_threshold: str,
        consecutive_days_required: i32,
        premium_per_policy: i32,
        coverage_per_policy: i32,
        max_policies: i32,
        season_end: i64
    ) -> str:
        self._only_admin()

        assert len(name) >= 3, "Name too short"
        assert len(region_name) >= 2, "Region name too short"
        assert len(latitude) > 0, "Latitude required"
        assert len(longitude) > 0, "Longitude required"
        assert len(drought_threshold) > 0, "Drought threshold required"
        assert int(consecutive_days_required) >= 1, "Consecutive days must be at least 1"
        assert int(premium_per_policy) > 0, "Premium must be greater than 0"
        assert int(coverage_per_policy) > int(premium_per_policy), "Coverage must exceed premium"
        assert int(max_policies) >= 1, "Max policies must be at least 1"

        self.pool_counter += i32(1)
        pool_id = f"pool_{self.pool_counter}"

        self.pools[pool_id] = Pool(
            pool_id=pool_id,
            name=name,
            description=description,
            region_name=region_name,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            drought_threshold=drought_threshold,
            consecutive_days_required=consecutive_days_required,
            premium_per_policy=premium_per_policy,
            coverage_per_policy=coverage_per_policy,
            max_policies=max_policies,
            total_policies=i32(0),
            vault_balance=i32(0),
            status="open",
            created_at=gl.message_raw["datetime"],
            created_by=str(gl.message.sender_address),
            trigger_activated_at="",
            policy_ids=[],
            reading_days=[],
            season_end=season_end
        )

        self.pool_ids.append(pool_id)
        return pool_id

    @gl.public.write
    def close_pool(self, pool_id: str) -> None:
        self._only_admin()
        assert pool_id in self.pools, "Pool not found"
        assert self.pools[pool_id].status == "open", "Pool not open"
        self.pools[pool_id].status = "closed"

    # ─── Buy Policy (no registration needed) ─────────────────

    @gl.public.write.payable
    def buy_policy(self, pool_id: str) -> str:
        """
        Any wallet can buy a policy. No registration required.
        Just pay the premium in GEN and you are covered.
        One policy per wallet per pool.
        """
        farmer = str(gl.message.sender_address)

        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "open", "Pool not accepting new policies"
        assert int(p.total_policies) < int(p.max_policies), "Pool is full"

        farmer_key = self._farmer_pool_key(pool_id, farmer)
        assert farmer_key not in self.farmer_pool_policy, "Already have a policy in this pool"

        expected_wei = u256(p.premium_per_policy) * u256(10**18)
        assert gl.message.value == expected_wei, "Must send exact premium amount in GEN"

        self.policy_counter += i32(1)
        policy_id = f"policy_{self.policy_counter}"

        self.policies[policy_id] = Policy(
            policy_id=policy_id,
            pool_id=pool_id,
            farmer=farmer,
            premium_paid=p.premium_per_policy,
            coverage_amount=p.coverage_per_policy,
            active=True,
            claimed=False,
            joined_at=gl.message_raw["datetime"]
        )

        self.pools[pool_id].total_policies += i32(1)
        self.pools[pool_id].vault_balance += p.premium_per_policy
        self.pools[pool_id].policy_ids.append(policy_id)
        self.farmer_pool_policy[farmer_key] = policy_id

        # Activate pool once it has at least 1 policy
        if p.status == "open":
            self.pools[pool_id].status = "active"

        return policy_id

    # ─── Admin Fund Vault ─────────────────────────────────────

    @gl.public.write.payable
    def fund_vault(self, pool_id: str) -> None:
        """
        Admin or sponsors can top up the vault to ensure
        sufficient funds for payouts beyond premium collection.
        """
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status in ["open", "active"], "Pool not active"

        amount_gen = int(gl.message.value) // (10**18)
        assert amount_gen > 0, "Must send GEN to fund vault"

        self.pools[pool_id].vault_balance += i32(amount_gen)

    # ─── Record Daily Weather Reading ─────────────────────────


    @gl.public.write
    def record_daily_reading(self, pool_id: str, day: str) -> None:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"

        reading_key = self._reading_key(pool_id, day)
        assert reading_key not in self.readings, "Reading already recorded for this day"

        lat = p.latitude
        lon = p.longitude
        threshold = p.drought_threshold
        recorder = str(gl.message.sender_address)

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert day <= today, "Cannot record readings for future dates"

        def fetch_weather() -> str:
            # Only use captured variables here — no self.* reads
            url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}"
                f"&longitude={lon}"
                f"&daily=soil_moisture_0_to_1cm"
                f"&daily=time"
                f"&timezone=auto"
                f"&forecast_days=1"
            )
            try:
                response = gl.nondet.web.get(url)
                raw = response.body.decode("utf-8")
                data = json.loads(raw)

                daily = data.get("daily", {})
                moisture_list = daily.get("soil_moisture_0_to_1cm", [])
                dates_list = daily.get("time", [])

                if not moisture_list or moisture_list[0] is None:
                    moisture_val = float(threshold)
                    weather_date = day
                else:
                    moisture_val = float(moisture_list[0])
                    weather_date = dates_list[0] if dates_list else day

                threshold_val = float(threshold)

                if moisture_val >= threshold_val:
                    drought_index = "normal"
                else:
                    ratio = moisture_val / threshold_val
                    if ratio >= 0.75:
                        drought_index = "watch"
                    elif ratio >= 0.50:
                        drought_index = "warning"
                    else:
                        drought_index = "severe"

                return json.dumps({
                    "moisture": str(round(moisture_val, 4)),
                    "drought_index": drought_index,
                    "weather_date": weather_date  # the date the API actually returned
                }, separators=(',', ':'))

            except:
                return json.dumps({
                    "moisture": threshold,
                    "drought_index": "normal",
                    "weather_date": day
                }, separators=(',', ':'))

        raw_result = gl.eq_principle.prompt_non_comparative(
            fetch_weather,
            task="Fetch soil moisture from Open-Meteo API and classify drought level",
            criteria="Return JSON with moisture value, drought_index (normal/watch/warning/severe), and the weather_date the API returned."
        )

        try:
            result_data = json.loads(
                raw_result.strip().strip('"').replace('\\"', '"')
            )
            moisture_val = result_data.get("moisture", threshold)
            drought_index = result_data.get("drought_index", "normal")
            weather_date = result_data.get("weather_date", day)
        except:
            moisture_val = threshold
            drought_index = "normal"
            weather_date = day

        assert weather_date == day, \
            f"API returned date {weather_date} does not match submitted day {day}"

        if drought_index not in ["normal", "watch", "warning", "severe"]:
            drought_index = "normal"

        self.readings[reading_key] = WeatherReading(
            day=day,
            soil_moisture=str(moisture_val),
            drought_index=drought_index,
            recorded_at=gl.message_raw["datetime"],
            recorded_by=recorder
        )

        self.pools[pool_id].reading_days.append(day)

    # ─── Check Trigger Condition ──────────────────────────────

    @gl.public.write
    def check_trigger(self, pool_id: str) -> bool:
        """
        Check if the drought trigger condition has been met.
        Looks at the last N consecutive days of readings.
        If all N days show drought_index of 'severe' or 'warning',
        the trigger fires and all farmers receive their coverage payout.
        Anyone can call this — no permission required.
        """
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"

        required_days = int(p.consecutive_days_required)
        all_days = list(p.reading_days)

        assert len(all_days) >= required_days, "Not enough readings yet"

        # Check the last N days
        recent_days = all_days[-required_days:]

        drought_days = 0
        for day in recent_days:
            rkey = self._reading_key(pool_id, day)
            if rkey in self.readings:
                reading = self.readings[rkey]
                if reading.drought_index in ["severe", "warning"]:
                    drought_days += 1

        if drought_days >= required_days:
            # Trigger condition met — execute payouts
            self._execute_payouts(pool_id, recent_days, drought_days)
            return True

        return False

    # ─── Execute Payouts ──────────────────────────────────────

    def _execute_payouts(
        self,
        pool_id: str,
        trigger_days: list[str],
        drought_days: int
    ) -> None:
        p = self.pools[pool_id]
        policy_ids = list(p.policy_ids)
        coverage = int(p.coverage_per_policy)
        vault = int(p.vault_balance)

        # Calculate how many farmers we can fully pay
        eligible = []
        for pid in policy_ids:
            policy = self.policies[pid]
            if policy.active and not policy.claimed:
                eligible.append(pid)

        total_needed = coverage * len(eligible)

        # If vault cannot cover everyone, pay proportionally
        if total_needed > vault:
            per_farmer = vault // len(eligible) if eligible else 0
        else:
            per_farmer = coverage

        trigger_reason = (
            f"Drought trigger: {drought_days} consecutive days of "
            f"severe/warning drought conditions detected. "
            f"Days checked: {', '.join(trigger_days[:5])}"
            f"{'...' if len(trigger_days) > 5 else ''}"
        )

        for pid in eligible:
            policy = self.policies[pid]
            farmer_wallet = policy.farmer

            if per_farmer > 0:
                self.payout_counter += i32(1)
                payout_id = f"payout_{self.payout_counter}"

                self.payouts[payout_id] = PayoutRecord(
                    payout_id=payout_id,
                    pool_id=pool_id,
                    farmer=farmer_wallet,
                    amount=i32(per_farmer),
                    trigger_reason=trigger_reason,
                    paid_at=gl.message_raw["datetime"]
                )

                self.policies[pid].claimed = True

                payout_wei = u256(per_farmer) * u256(10**18)
                _Recipient(Address(farmer_wallet)).emit_transfer(value=payout_wei)

        self.pools[pool_id].status = "triggered"
        self.pools[pool_id].trigger_activated_at = gl.message_raw["datetime"]
        self.pools[pool_id].vault_balance = i32(
            max(0, vault - (per_farmer * len(eligible)))
        )

    @gl.public.write
    def expire_pool(self, pool_id: str) -> None:
        """
        Anyone can call this after the pool's season ends.
        If not triggered, refunds remaining vault balance to admin.
        """
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not expirable"

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        assert now >= int(p.season_end), "Pool season not ended yet"

        self.pools[pool_id].status = "expired"

        # Refund remaining vault to admin if any surplus
        remaining = int(p.vault_balance)
        if remaining > 0:
            self.pools[pool_id].vault_balance = i32(0)
            _Recipient(Address(self.admin)).emit_transfer(
                value=u256(remaining) * u256(10**18)
            )


    @gl.public.write
    def admin_trigger_payout(
        self,
        pool_id: str,
        reason: str
    ) -> None:
        """
        Emergency admin override for cases where API data is
        unavailable but ground-truth conditions clearly warrant payout.
        """
        self._only_admin()
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"

        recent_days = list(p.reading_days[-7:]) if len(p.reading_days) >= 7 else list(p.reading_days)
        self._execute_payouts(pool_id, recent_days, len(recent_days))

    # ─── Cancel Policy & Refund (before trigger) ─────────────

    @gl.public.write
    def cancel_policy(self, policy_id: str) -> None:
        """
        Farmers can cancel their policy and receive a partial refund
        as long as the pool has not triggered yet.
        Refund is 50% of premium to account for admin costs.
        """
        farmer = str(gl.message.sender_address)
        assert policy_id in self.policies, "Policy not found"
        policy = self.policies[policy_id]
        assert policy.farmer == farmer, "Not your policy"
        assert policy.active, "Policy not active"
        assert not policy.claimed, "Policy already claimed"

        pool_id = policy.pool_id
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status != "triggered", "Cannot cancel after trigger"

        refund = int(policy.premium_paid) // 2

        self.policies[policy_id].active = False
        self.pools[pool_id].total_policies -= i32(1)
        self.pools[pool_id].vault_balance -= i32(refund)

        farmer_key = self._farmer_pool_key(pool_id, farmer)
        if farmer_key in self.farmer_pool_policy:
            del self.farmer_pool_policy[farmer_key]

        if refund > 0:
            refund_wei = u256(refund) * u256(10**18)
            _Recipient(Address(farmer)).emit_transfer(value=refund_wei)

    # ─── Read Methods ─────────────────────────────────────────

    @gl.public.view
    def get_pool(self, pool_id: str) -> Pool:
        assert pool_id in self.pools, "Pool not found"
        return gl.storage.copy_to_memory(self.pools[pool_id])

    @gl.public.view
    def get_all_pools(self) -> list[Pool]:
        result = []
        for pid in self.pool_ids:
            result.append(gl.storage.copy_to_memory(self.pools[pid]))
        return result

    @gl.public.view
    def get_active_pools(self) -> list[Pool]:
        result = []
        for pid in self.pool_ids:
            p = self.pools[pid]
            if p.status in ["open", "active"]:
                result.append(gl.storage.copy_to_memory(p))
        return result

    @gl.public.view
    def get_policy(self, policy_id: str) -> Policy:
        assert policy_id in self.policies, "Policy not found"
        return gl.storage.copy_to_memory(self.policies[policy_id])

    @gl.public.view
    def get_farmer_policy(self, pool_id: str, wallet: str) -> Policy:
        farmer_key = self._farmer_pool_key(pool_id, wallet)
        assert farmer_key in self.farmer_pool_policy, "No policy found"
        policy_id = self.farmer_pool_policy[farmer_key]
        return gl.storage.copy_to_memory(self.policies[policy_id])

    @gl.public.view
    def has_policy(self, pool_id: str, wallet: str) -> bool:
        farmer_key = self._farmer_pool_key(pool_id, wallet)
        return farmer_key in self.farmer_pool_policy

    @gl.public.view
    def get_pool_policies(self, pool_id: str) -> list[Policy]:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        result = []
        for pid in p.policy_ids:
            result.append(gl.storage.copy_to_memory(self.policies[pid]))
        return result

    @gl.public.view
    def get_weather_reading(self, pool_id: str, day: str) -> WeatherReading:
        rkey = self._reading_key(pool_id, day)
        assert rkey in self.readings, "Reading not found"
        return gl.storage.copy_to_memory(self.readings[rkey])

    @gl.public.view
    def get_recent_readings(self, pool_id: str, days: i32) -> list[WeatherReading]:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        all_days = list(p.reading_days)
        n = min(int(days), len(all_days))
        recent = all_days[-n:]
        result = []
        for day in recent:
            rkey = self._reading_key(pool_id, day)
            if rkey in self.readings:
                result.append(gl.storage.copy_to_memory(self.readings[rkey]))
        return result

    @gl.public.view
    def get_payout(self, payout_id: str) -> PayoutRecord:
        assert payout_id in self.payouts, "Payout not found"
        return gl.storage.copy_to_memory(self.payouts[payout_id])

    @gl.public.view
    def get_pool_payouts(self, pool_id: str) -> list[PayoutRecord]:
        result = []
        counter = int(self.payout_counter)
        for i in range(1, counter + 1):
            payout_id = f"payout_{i}"
            if payout_id in self.payouts:
                payout = self.payouts[payout_id]
                if payout.pool_id == pool_id:
                    result.append(gl.storage.copy_to_memory(payout))
        return result

    @gl.public.view
    def get_farmer_payouts(self, wallet: str) -> list[PayoutRecord]:
        result = []
        counter = int(self.payout_counter)
        for i in range(1, counter + 1):
            payout_id = f"payout_{i}"
            if payout_id in self.payouts:
                payout = self.payouts[payout_id]
                if payout.farmer == wallet:
                    result.append(gl.storage.copy_to_memory(payout))
        return result

    @gl.public.view
    def get_consecutive_drought_days(self, pool_id: str) -> i32:
        """
        Returns how many consecutive drought days have been recorded
        so far. Useful for the frontend to show progress toward trigger.
        """
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        all_days = list(p.reading_days)

        consecutive = 0
        for day in reversed(all_days):
            rkey = self._reading_key(pool_id, day)
            if rkey in self.readings:
                reading = self.readings[rkey]
                if reading.drought_index in ["severe", "warning"]:
                    consecutive += 1
                else:
                    break
            else:
                break

        return i32(consecutive)

    @gl.public.view
    def get_total_pools(self) -> i32:
        return self.pool_counter

    @gl.public.view
    def get_total_policies(self) -> i32:
        return self.policy_counter

    @gl.public.view
    def get_total_payouts(self) -> i32:
        return self.payout_counter