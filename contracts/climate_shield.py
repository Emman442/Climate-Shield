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
    day: str
    soil_moisture: str
    drought_index: str
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
    latitude: str
    longitude: str
    radius_km: str
    drought_threshold: str
    consecutive_days_required: i32
    premium_per_policy: i32
    coverage_per_policy: i32
    max_policies: i32
    total_policies: i32
    vault_balance: i32
    status: str
    created_at: str
    created_by: str
    trigger_activated_at: str
    policy_ids: DynArray[str]
    reading_days: DynArray[str]
    season_end: i64
    admin_override_reason: str
    admin_override_evidence: str
    admin_override_at: str


class ClimateShield(gl.Contract):
    pools: TreeMap[str, Pool]
    pool_ids: DynArray[str]
    pool_counter: i32
    policies: TreeMap[str, Policy]
    policy_counter: i32
    readings: TreeMap[str, WeatherReading]
    payouts: TreeMap[str, PayoutRecord]
    payout_counter: i32
    farmer_pool_policy: TreeMap[str, str]
    admin: str

    def __init__(self, admin_address: str):
        self.admin = admin_address
        self.pool_counter = i32(0)
        self.policy_counter = i32(0)
        self.payout_counter = i32(0)

    def _only_admin(self) -> None:
        assert str(gl.message.sender_address).lower() == str(self.admin).lower(), "Only admin"

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
        if ratio >= 0.50:
            return "warning"
        return "severe"

    def _tx_day(self) -> str:
        return str(gl.message_raw["datetime"])[:10]

    def _season_end_day(self, season_end: i64) -> str:
        """Convert season_end (unix ms if > 10000, else YYYYMMDD-style) to YYYY-MM-DD."""
        if int(season_end) > 10000:
            from datetime import datetime as dt, timezone as tz
            return dt.fromtimestamp(int(season_end) / 1000, tz=tz.utc).strftime("%Y-%m-%d")
        return str(season_end)

    def _verified_trigger_days(self, pool_id: str) -> list[str]:
        p = self.pools[pool_id]
        required = int(p.consecutive_days_required)
        all_days = list(p.reading_days)
        assert len(all_days) >= required, "Not enough readings yet"
        recent = all_days[-required:]
        from datetime import datetime as dt
        for i in range(1, len(recent)):
            prev_date = dt.strptime(recent[i - 1], "%Y-%m-%d")
            curr_date = dt.strptime(recent[i], "%Y-%m-%d")
            assert (curr_date - prev_date).days == 1, "Readings are not consecutive"
        season_end_day = self._season_end_day(p.season_end)
        for day in recent:
            assert day <= season_end_day, "Trigger day is outside the pool season"
            reading = self.readings[self._reading_key(pool_id, day)]
            assert reading.drought_index in ("warning", "severe"), "Verified readings do not meet the drought rule"
        return recent

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
        assert len(latitude) > 0 and len(longitude) > 0, "Coordinates required"
        assert float(drought_threshold) > 0, "Drought threshold required"
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
            season_end=season_end,
            admin_override_reason="",
            admin_override_evidence="",
            admin_override_at="",
        )
        self.pool_ids.append(pool_id)
        return pool_id

    @gl.public.write
    def close_pool(self, pool_id: str) -> None:
        self._only_admin()
        assert pool_id in self.pools, "Pool not found"
        assert self.pools[pool_id].status == "open", "Pool not open"
        self.pools[pool_id].status = "closed"

    @gl.public.write.payable
    def buy_policy(self, pool_id: str) -> str:
        farmer = str(gl.message.sender_address)
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status in ["open", "active"], "Pool not accepting new policies"
        season_end_day = self._season_end_day(p.season_end)
        assert self._tx_day() < season_end_day, "Cannot enroll after season end"
        assert int(p.total_policies) < int(p.max_policies), "Pool is full"
        farmer_key = self._farmer_pool_key(pool_id, farmer)
        assert farmer_key not in self.farmer_pool_policy, "Already have a policy in this pool"
        assert gl.message.value == u256(p.premium_per_policy) * u256(10**18), "Must send exact premium amount in GEN"

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
        if p.status == "open":
            self.pools[pool_id].status = "active"
        return policy_id

    @gl.public.write.payable
    def fund_vault(self, pool_id: str) -> None:
        assert pool_id in self.pools, "Pool not found"
        assert self.pools[pool_id].status in ["open", "active"], "Pool not active"
        amount_gen = int(gl.message.value) // (10**18)
        assert amount_gen > 0, "Must send GEN to fund vault"
        self.pools[pool_id].vault_balance += i32(amount_gen)

    @gl.public.write
    def record_daily_reading(self, pool_id: str, day: str) -> None:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"
        assert len(day) == 10 and day[4] == "-" and day[7] == "-", "day must be YYYY-MM-DD"
        reading_key = self._reading_key(pool_id, day)
        assert reading_key not in self.readings, "Reading already recorded for this day"
        assert day <= self._tx_day(), "Cannot record readings for future dates"
        season_end_day = self._season_end_day(p.season_end)
        assert day <= season_end_day, "Reading day is outside the pool season"

        lat = p.latitude
        lon = p.longitude

        def fetch_moisture() -> str:
            url = (
                "https://archive-api.open-meteo.com/v1/archive"
                f"?latitude={lat}&longitude={lon}"
                f"&start_date={day}&end_date={day}"
                "&hourly=soil_moisture_0_to_7cm&timezone=UTC&models=era5_land"
            )
            data = json.loads(gl.nondet.web.get(url).body.decode("utf-8"))
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            values = hourly.get("soil_moisture_0_to_7cm", [])
            matched = []
            for i in range(min(len(times), len(values))):
                if str(times[i])[:10] == day and values[i] is not None:
                    matched.append(float(values[i]))
            if len(matched) == 0:
                return ""
            return str(round(sum(matched) / float(len(matched)), 4))

        agreed = str(gl.eq_principle.strict_eq(fetch_moisture)).strip()
        assert agreed != "", "Could not verify the Open-Meteo moisture value for this day"
        moisture = float(agreed)
        drought_index = self._classify_drought(moisture, float(p.drought_threshold))

        self.readings[reading_key] = WeatherReading(
            day=day,
            soil_moisture=agreed,
            drought_index=drought_index,
            recorded_at=gl.message_raw["datetime"],
            recorded_by=str(gl.message.sender_address)
        )
        self.pools[pool_id].reading_days.append(day)

    @gl.public.write
    def check_trigger(self, pool_id: str) -> bool:
        assert pool_id in self.pools, "Pool not found"
        assert self.pools[pool_id].status == "active", "Pool not active"
        recent = self._verified_trigger_days(pool_id)
        self._execute_payouts(pool_id, recent, len(recent), "")
        return True

    def _execute_payouts(self, pool_id: str, trigger_days: list[str], drought_days: int, reason: str) -> None:
        p = self.pools[pool_id]
        coverage = int(p.coverage_per_policy)
        vault = int(p.vault_balance)
        first_trigger_day = trigger_days[0] if trigger_days else ""
        eligible = []
        for pid in list(p.policy_ids):
            policy = self.policies[pid]
            if not (policy.active and not policy.claimed):
                continue
            joined_day = str(policy.joined_at)[:10]
            if first_trigger_day and joined_day >= first_trigger_day:
                continue
            eligible.append(pid)
        assert len(eligible) > 0, "No eligible policies that predate the trigger days"
        per_farmer = vault // len(eligible) if coverage * len(eligible) > vault else coverage
        trigger_reason = (
            f"Drought trigger: {drought_days} consecutive verified warning/severe days. "
            f"Days: {', '.join(trigger_days)}"
        )
        if reason.strip() != "":
            trigger_reason = trigger_reason + " Note: " + reason.strip()[:300]

        for pid in eligible:
            policy = self.policies[pid]
            if per_farmer > 0:
                self.payout_counter += i32(1)
                payout_id = f"payout_{self.payout_counter}"
                self.payouts[payout_id] = PayoutRecord(
                    payout_id=payout_id,
                    pool_id=pool_id,
                    farmer=policy.farmer,
                    amount=i32(per_farmer),
                    trigger_reason=trigger_reason,
                    paid_at=gl.message_raw["datetime"]
                )
                self.policies[pid].claimed = True
                _Recipient(Address(policy.farmer)).emit_transfer(value=u256(per_farmer) * u256(10**18))

        self.pools[pool_id].status = "triggered"
        self.pools[pool_id].trigger_activated_at = gl.message_raw["datetime"]
        self.pools[pool_id].vault_balance = i32(max(0, vault - (per_farmer * len(eligible))))

    @gl.public.write
    def expire_pool(self, pool_id: str) -> None:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not expirable"
        day = self._tx_day()
        season_end_day = self._season_end_day(p.season_end)
        assert day >= season_end_day, "Pool season not ended yet"
        self.pools[pool_id].status = "expired"
        remaining = int(p.vault_balance)
        if remaining > 0:
            self.pools[pool_id].vault_balance = i32(0)
            _Recipient(Address(self.admin)).emit_transfer(value=u256(remaining) * u256(10**18))

    @gl.public.write
    def admin_trigger_payout(self, pool_id: str, reason: str) -> None:
        """Admin may attach a note, but still requires the same verified Open-Meteo streak.
        This is not a source-outage or manual-override path."""
        self._only_admin()
        assert pool_id in self.pools, "Pool not found"
        assert self.pools[pool_id].status == "active", "Pool not active"
        assert len(reason.strip()) >= 20, "Reason must be at least 20 characters"
        recent = self._verified_trigger_days(pool_id)
        self.pools[pool_id].admin_override_reason = reason.strip()
        self.pools[pool_id].admin_override_evidence = "requires-verified-open-meteo-readings"
        self.pools[pool_id].admin_override_at = gl.message_raw["datetime"]
        self._execute_payouts(pool_id, recent, len(recent), reason.strip())

    @gl.public.write
    def cancel_policy(self, policy_id: str) -> None:
        farmer = str(gl.message.sender_address)
        assert policy_id in self.policies, "Policy not found"
        policy = self.policies[policy_id]
        assert policy.farmer == farmer, "Not your policy"
        assert policy.active and not policy.claimed, "Policy is not cancellable"
        pool_id = policy.pool_id
        pool_status = self.pools[pool_id].status
        assert pool_status != "triggered", "Cannot cancel after trigger"
        assert pool_status != "expired", "Cannot cancel after expiry"
        refund = int(policy.premium_paid) // 2
        self.policies[policy_id].active = False
        self.pools[pool_id].total_policies -= i32(1)
        self.pools[pool_id].vault_balance -= i32(refund)
        farmer_key = self._farmer_pool_key(pool_id, farmer)
        if farmer_key in self.farmer_pool_policy:
            del self.farmer_pool_policy[farmer_key]
        if refund > 0:
            _Recipient(Address(farmer)).emit_transfer(value=u256(refund) * u256(10**18))

    @gl.public.view
    def get_pool(self, pool_id: str) -> Pool:
        assert pool_id in self.pools, "Pool not found"
        return gl.storage.copy_to_memory(self.pools[pool_id])

    @gl.public.view
    def get_all_pools(self) -> list[Pool]:
        return [gl.storage.copy_to_memory(self.pools[pid]) for pid in self.pool_ids]

    @gl.public.view
    def get_active_pools(self) -> list[Pool]:
        return [gl.storage.copy_to_memory(self.pools[pid]) for pid in self.pool_ids if self.pools[pid].status in ["open", "active"]]

    @gl.public.view
    def get_policy(self, policy_id: str) -> Policy:
        assert policy_id in self.policies, "Policy not found"
        return gl.storage.copy_to_memory(self.policies[policy_id])

    @gl.public.view
    def get_farmer_policy(self, pool_id: str, wallet: str) -> Policy:
        farmer_key = self._farmer_pool_key(pool_id, wallet)
        assert farmer_key in self.farmer_pool_policy, "No policy found"
        return gl.storage.copy_to_memory(self.policies[self.farmer_pool_policy[farmer_key]])

    @gl.public.view
    def has_policy(self, pool_id: str, wallet: str) -> bool:
        return self._farmer_pool_key(pool_id, wallet) in self.farmer_pool_policy

    @gl.public.view
    def get_pool_policies(self, pool_id: str) -> list[Policy]:
        assert pool_id in self.pools, "Pool not found"
        return [gl.storage.copy_to_memory(self.policies[pid]) for pid in self.pools[pool_id].policy_ids]

    @gl.public.view
    def get_weather_reading(self, pool_id: str, day: str) -> WeatherReading:
        rkey = self._reading_key(pool_id, day)
        assert rkey in self.readings, "Reading not found"
        return gl.storage.copy_to_memory(self.readings[rkey])

    @gl.public.view
    def get_recent_readings(self, pool_id: str, days: i32) -> list[WeatherReading]:
        assert pool_id in self.pools, "Pool not found"
        all_days = list(self.pools[pool_id].reading_days)
        recent = all_days[-min(int(days), len(all_days)):]
        return [gl.storage.copy_to_memory(self.readings[self._reading_key(pool_id, day)]) for day in recent if self._reading_key(pool_id, day) in self.readings]

    @gl.public.view
    def get_payout(self, payout_id: str) -> PayoutRecord:
        assert payout_id in self.payouts, "Payout not found"
        return gl.storage.copy_to_memory(self.payouts[payout_id])

    @gl.public.view
    def get_pool_payouts(self, pool_id: str) -> list[PayoutRecord]:
        result = []
        for i in range(1, int(self.payout_counter) + 1):
            payout_id = f"payout_{i}"
            if payout_id in self.payouts and self.payouts[payout_id].pool_id == pool_id:
                result.append(gl.storage.copy_to_memory(self.payouts[payout_id]))
        return result

    @gl.public.view
    def get_farmer_payouts(self, wallet: str) -> list[PayoutRecord]:
        result = []
        for i in range(1, int(self.payout_counter) + 1):
            payout_id = f"payout_{i}"
            if payout_id in self.payouts and self.payouts[payout_id].farmer == wallet:
                result.append(gl.storage.copy_to_memory(self.payouts[payout_id]))
        return result

    @gl.public.view
    def get_consecutive_drought_days(self, pool_id: str) -> i32:
        assert pool_id in self.pools, "Pool not found"
        consecutive = 0
        for day in reversed(list(self.pools[pool_id].reading_days)):
            rkey = self._reading_key(pool_id, day)
            if rkey not in self.readings or self.readings[rkey].drought_index not in ("warning", "severe"):
                break
            consecutive += 1
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