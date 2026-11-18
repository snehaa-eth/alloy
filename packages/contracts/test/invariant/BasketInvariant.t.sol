// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "../utils/Fixture.sol";
import {console2} from "forge-std/console2.sol";
import {Handler} from "./Handler.sol";
import {Basket} from "../../src/Basket.sol";
import {IBasketFactory} from "../../src/interfaces/IBasketFactory.sol";
import {MockV3Aggregator} from "../utils/MockV3Aggregator.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IPolicyRegistry} from "base-std/interfaces/IPolicyRegistry.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

/// @notice §3.5 invariants 1-7 under random issue/redeem/donate/warp/accrue/rebalance/buy/sell/policy-block.
contract BasketInvariantTest is Fixture {
    Handler internal h;
    Basket internal b;
    address[] internal actors;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    function setUp() public override {
        super.setUp();
        IBasketFactory.BasketParams memory p = _params3();
        p.absBandBps = 1000;
        p.relBandBps = 5000;
        b = _create(creator, p, 1000e6);
        vm.prank(owner);
        factory.setBasketTvlCap(address(b), type(uint256).max);

        actors.push(asha);
        actors.push(ben);
        actors.push(makeAddr("carol"));
        MockV3Aggregator[] memory fs = new MockV3Aggregator[](3);
        for (uint256 i; i < 3; ++i) {
            fs[i] = feeds[i];
        }
        h = new Handler(b, router, adapter, usdc, keeper, actors, fs);
        usdc.grantRole(B20Constants.MINT_ROLE, address(h));
        for (uint256 i; i < 3; ++i) {
            stocks[i].grantRole(B20Constants.MINT_ROLE, address(h));
        }
        // blocklist policy on tBBB receivers, administered by the handler (toggles actors on/off)
        uint64 pid = StdPrecompiles.POLICY_REGISTRY.createPolicy(address(h), IPolicyRegistry.PolicyType.BLOCKLIST);
        stocks[1].updatePolicy(B20Constants.TRANSFER_RECEIVER_POLICY, pid);
        h.setBlockPolicy(pid);
        targetContract(address(h));
    }

    function invariant_supplyAtLeastDead() public view {
        assertGe(b.totalSupply(), b.deadShares());
        assertEq(b.balanceOf(DEAD), b.deadShares());
    }

    function invariant_sumOfBalancesEqualsSupply() public view {
        uint256 sum = b.balanceOf(DEAD) + b.balanceOf(creator) + b.balanceOf(treasury) + b.balanceOf(address(router))
            + b.balanceOf(address(h));
        for (uint256 i; i < actors.length; ++i) {
            sum += b.balanceOf(actors[i]);
        }
        assertEq(sum, b.totalSupply());
    }

    function invariant_perShareNonDecreasing() public view {
        assertFalse(h.perShareViolation());
    }

    function invariant_roundTripNeverProfits() public view {
        assertFalse(h.roundTripViolation());
    }

    function invariant_feeBound() public view {
        assertFalse(h.feeViolation());
    }

    function invariant_rebalanceRules() public view {
        assertEq(h.rebalanceViolation(), 0);
        assertLe(b.lossBudgetUsed(), 300e14);
    }

    function invariant_zeroAllowancesAndRouterEmpty() public view {
        address[] memory comps = b.components();
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(b)), 0);
        assertEq(usdc.allowance(address(b), address(adapter)), 0);
        assertEq(usdc.allowance(address(router), address(adapter)), 0);
        for (uint256 i; i < comps.length; ++i) {
            assertEq(IB20(comps[i]).balanceOf(address(router)), 0);
            assertEq(IB20(comps[i]).allowance(address(router), address(b)), 0);
            assertEq(IB20(comps[i]).allowance(address(router), address(adapter)), 0);
            assertEq(IB20(comps[i]).allowance(address(b), address(adapter)), 0);
        }
    }

    function invariant_owedIsBacked() public view {
        address[] memory comps = b.components();
        for (uint256 i; i < comps.length; ++i) {
            uint256 sumOwed;
            for (uint256 k; k < actors.length; ++k) {
                sumOwed += b.owed(actors[k], comps[i]);
            }
            assertEq(sumOwed, b.totalOwed(comps[i]));
            assertGe(IB20(comps[i]).balanceOf(address(b)), b.totalOwed(comps[i]));
        }
    }

    function afterInvariant() public view {
        // visibility into how much of the state space was exercised
        assertGt(h.calls(), 0);
        console2.log("rebalancesOk", h.rebalancesOk());
        console2.log("cooldown", h.failCount(Basket.RebalanceCooldown.selector));
        console2.log("band", h.failCount(Basket.BandViolation.selector));
        console2.log("stale", h.failCount(bytes4(keccak256("StaleFeed(address,uint256)"))));
        console2.log("loss", h.failCount(Basket.LossTooHigh.selector));
        console2.log("budget", h.failCount(Basket.WeeklyBudgetExceeded.selector));
    }
}
