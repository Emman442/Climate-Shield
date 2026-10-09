"""Direct-mode tests for ClimateShield"""

import json

import pytest

CONTRACT = "contracts/climate_shield.py"
ONE_GEN = 10**18
THRESHOLD = "0.20"


def as_address(value) -> str:
    if isinstance(value, bytes):
        return "0x" + value.hex()
    text = str(value)
    if text.startswith("0x"):
        return text
    return "0x" + text


def deploy(direct_vm, direct_deploy, admin):
    direct_vm.sender = admin
    direct_vm.value = 0
    return direct_deploy(CONTRACT, as_address(admin), sdk_version="v0.2.16")


def rejects(match):
    return pytest.raises(AssertionError, match=match)


def create_pool(contract, days=2):
    return contract.create_pool(
        "Sahel cover",
        "Soil moisture cover for one season",
        "Sahel",
        "13.5",
        "2.1",
        "25",
        THRESHOLD,
        days,
        2,
        10,
        20,
        1790000000000,
    )


def mock_day(direct_vm, day, moisture):
    body = json.dumps({
        "hourly": {
            "time": [day + "T00:00", day + "T01:00"],
            "soil_moisture_0_to_7cm": [moisture, moisture],
        }
    })
    direct_vm.mock_web(r"archive-api\.open-meteo\.com", {"status": 200, "body": body})


def buy(contract, direct_vm, pool_id):
    direct_vm.value = 2 * ONE_GEN
    return contract.buy_policy(pool_id)


def test_reading_recomputes_severe_from_agreed_moisture(direct_vm, direct_deploy, direct_owner):
    direct_vm.warp("2024-06-03T00:00:00Z")
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    pool_id = create_pool(contract)
    buy(contract, direct_vm, pool_id)

    mock_day(direct_vm, "2024-06-01", 0.05)
    contract.record_daily_reading(pool_id, "2024-06-01")

    reading = contract.get_weather_reading(pool_id, "2024-06-01")
    assert reading.soil_moisture == "0.05"
    assert reading.drought_index == "severe"


def test_missing_moisture_does_not_store_normal(direct_vm, direct_deploy, direct_owner):
    direct_vm.warp("2024-06-03T00:00:00Z")
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    pool_id = create_pool(contract)
    buy(contract, direct_vm, pool_id)

    direct_vm.mock_web(
        r"archive-api\.open-meteo\.com",
        {"status": 200, "body": json.dumps({"hourly": {"time": [], "soil_moisture_0_to_7cm": []}})},
    )
    with rejects("Could not verify the Open-Meteo moisture value"):
        contract.record_daily_reading(pool_id, "2024-06-01")


def test_hours_from_another_day_are_ignored(direct_vm, direct_deploy, direct_owner):
    direct_vm.warp("2024-06-03T00:00:00Z")
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    pool_id = create_pool(contract)
    buy(contract, direct_vm, pool_id)

    body = json.dumps({
        "hourly": {
            "time": ["2024-06-02T00:00"],
            "soil_moisture_0_to_7cm": [0.01],
        }
    })
    direct_vm.mock_web(r"archive-api\.open-meteo\.com", {"status": 200, "body": body})
    with rejects("Could not verify the Open-Meteo moisture value"):
        contract.record_daily_reading(pool_id, "2024-06-01")


def test_trigger_pays_only_after_consecutive_verified_drought(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.warp("2024-06-03T00:00:00Z")
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    pool_id = create_pool(contract)
    direct_vm.sender = direct_alice
    policy_id = buy(contract, direct_vm, pool_id)
    direct_vm.sender = direct_owner

    mock_day(direct_vm, "2024-06-01", 0.05)
    contract.record_daily_reading(pool_id, "2024-06-01")
    with rejects("Not enough readings yet"):
        contract.check_trigger(pool_id)

    direct_vm.clear_mocks()
    mock_day(direct_vm, "2024-06-02", 0.08)
    contract.record_daily_reading(pool_id, "2024-06-02")
    assert contract.check_trigger(pool_id) is True

    policy = contract.get_policy(policy_id)
    assert policy.claimed is True
    assert contract.get_pool(pool_id).status == "triggered"
    assert "2024-06-01" in contract.get_payout("payout_1").trigger_reason


def test_admin_cannot_pay_without_verified_readings(direct_vm, direct_deploy, direct_owner):
    direct_vm.warp("2024-06-03T00:00:00Z")
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    pool_id = create_pool(contract)
    buy(contract, direct_vm, pool_id)

    with rejects("Not enough readings yet"):
        contract.admin_trigger_payout(pool_id, "Ground report says the field is dry")


def test_admin_reason_is_kept_only_after_verified_readings(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.warp("2024-06-03T00:00:00Z")
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    pool_id = create_pool(contract)
    direct_vm.sender = direct_alice
    buy(contract, direct_vm, pool_id)
    direct_vm.sender = direct_owner

    mock_day(direct_vm, "2024-06-01", 0.05)
    contract.record_daily_reading(pool_id, "2024-06-01")
    direct_vm.clear_mocks()
    mock_day(direct_vm, "2024-06-02", 0.05)
    contract.record_daily_reading(pool_id, "2024-06-02")

    direct_vm.sender = direct_alice
    with rejects("Only admin"):
        contract.admin_trigger_payout(pool_id, "Ground report says the field is dry")

    direct_vm.sender = direct_owner
    contract.admin_trigger_payout(pool_id, "Ground report says the field is dry")
    reason = contract.get_payout("payout_1").trigger_reason
    assert "Ground report says the field is dry" in reason
    assert contract.get_pool(pool_id).admin_override_reason == "Ground report says the field is dry"