// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IB20Asset} from "base-std/interfaces/IB20Asset.sol";
import {IPolicyRegistry} from "base-std/interfaces/IPolicyRegistry.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

import {Basket} from "../../src/Basket.sol";
import {AlloyRouter} from "../../src/AlloyRouter.sol";
import {IBasket} from "../../src/interfaces/IBasket.sol";
import {MockV3Aggregator} from "../utils/MockV3Aggregator.sol";
import {MockSwapAdapter} from "../utils/MockSwapAdapter.sol";

contract Handler is Test {
    Basket public b;
    AlloyRouter public router;
    MockSwapAdapter public adapter;
    IB20 public usdc;
    address public keeper;
    address[] public actors;
    address[] public comps;
    MockV3Aggregator[] public feeds;
    uint64 public blockPolicy;

    // ghosts
    bool public perShareViolation;
    bool public feeViolation;
    uint256 public rebalanceViolation; // 0 = none, else code
    bool public roundTripViolation;
    uint256 public rebalancesOk;
    uint256 public calls;
    mapping(bytes4 => uint256) public failCount;

    constructor(
        Basket b_,
        AlloyRouter router_,
        MockSwapAdapter adapter_,
        IB20 usdc_,
        address keeper_,
        address[] memory actors_,
        MockV3Aggregator[] memory feeds_
    ) {
        b = b_;
        router = router_;
        adapter = adapter_;
        usdc = usdc_;
        keeper = keeper_;
        actors = actors_;
        comps = b_.components();
        for (uint256 i; i < feeds_.length; ++i) {
            feeds.push(feeds_[i]);
        }
    }

    function setBlockPolicy(uint64 pid) external {
        blockPolicy = pid;
    }

    // ------------------------------------------------------------------ helpers
    function _actor(uint256 s) internal view returns (address) {
        return actors[s % actors.length];
    }

    function _perShare() internal view returns (uint256[] memory r) {
        (, uint256[] memory bals) = b.getBundle();
        uint256 ts = b.totalSupply();
        r = new uint256[](bals.length);
        for (uint256 i; i < bals.length; ++i) {
            r[i] = bals[i] * 1e18 / ts;
        }
    }

    function _checkPerShare(uint256[] memory before) internal {
        uint256[] memory a = _perShare();
        for (uint256 i; i < a.length; ++i) {
            if (a[i] < before[i]) perShareViolation = true;
        }
    }

    function _mintBundle(address to, uint256[] memory amts) internal {
        for (uint256 i; i < comps.length; ++i) {
            if (amts[i] > 0) IB20(comps[i]).mint(to, amts[i]);
            vm.prank(to);
            IB20(comps[i]).approve(address(b), amts[i]);
        }
    }

    // ------------------------------------------------------------------ actions
    function issue(uint256 actorSeed, uint256 shares) external {
        calls++;
        address a = _actor(actorSeed);
        shares = bound(shares, 1, 2000e18);
        b.accrueFee();
        uint256[] memory before = _perShare();
        uint256[] memory amts = b.previewIssue(shares);
        _mintBundle(a, amts);
        vm.prank(a);
        try b.issue(shares, a) {} catch {}
        _checkPerShare(before);
    }

    function redeem(uint256 actorSeed, uint256 frac) external {
        calls++;
        address a = _actor(actorSeed);
        uint256 bal = b.balanceOf(a);
        if (bal == 0) return;
        uint256 shares = bound(frac, 1, bal);
        b.accrueFee();
        uint256[] memory before = _perShare();
        vm.prank(a);
        b.redeem(shares, a);
        _checkPerShare(before);
    }

    function issueRedeem(uint256 actorSeed, uint256 shares) external {
        calls++;
        address a = _actor(actorSeed);
        shares = bound(shares, 1, 1000e18);
        uint256[] memory amts = b.previewIssue(shares);
        _mintBundle(a, amts);
        vm.prank(a);
        try b.issue(shares, a) returns (uint256[] memory paid) {
            vm.prank(a);
            (uint256[] memory got,) = b.redeem(shares, a);
            for (uint256 i; i < got.length; ++i) {
                if (got[i] > paid[i]) roundTripViolation = true;
            }
        } catch {}
    }

    function donate(uint256 compSeed, uint256 amt) external {
        calls++;
        amt = bound(amt, 1, 1e9);
        uint256[] memory before = _perShare();
        IB20(comps[compSeed % comps.length]).mint(address(b), amt);
        _checkPerShare(before);
    }

    function warp(uint256 dt) external {
        calls++;
        dt = bound(dt, 1, 3 days);
        vm.warp(block.timestamp + dt);
        for (uint256 i; i < feeds.length; ++i) {
            feeds[i].set(feeds[i].answer());
        }
    }

    function movePrice(uint256 i, uint256 bps) external {
        calls++;
        i = i % comps.length;
        bps = bound(bps, 8000, 12_500);
        int256 px = feeds[i].answer() * int256(bps) / 10_000;
        if (px < 1e8) px = 1e8;
        if (px > 10_000e8) px = 10_000e8;
        feeds[i].set(px);
    }

    function accrue() external {
        calls++;
        uint256 ts = b.totalSupply();
        uint256 dt = block.timestamp - b.lastAccrual();
        if (dt > 365 days) dt = 365 days;
        uint256 f = b.feeBps();
        uint256 minted = b.accrueFee();
        if (minted * (365 days * 10_000 - f * dt) > ts * f * dt) feeViolation = true;
        if (minted > ts * f * dt / (365 days * 10_000 - f * dt) + 1) feeViolation = true;
        if (b.accrueFee() != 0) feeViolation = true;
    }

    function toggleBlock(uint256 actorSeed, bool blocked) external {
        calls++;
        address[] memory accts = new address[](1);
        accts[0] = _actor(actorSeed);
        StdPrecompiles.POLICY_REGISTRY.updateBlocklist(blockPolicy, blocked, accts);
    }

    function claim(uint256 actorSeed, uint256 compSeed) external {
        calls++;
        address a = _actor(actorSeed);
        address token = comps[compSeed % comps.length];
        if (b.owed(a, token) == 0) return;
        vm.prank(a);
        b.claimOwed(token, address(uint160(uint256(keccak256(abi.encode(a, "alt"))))));
    }

    function buy(uint256 actorSeed, uint256 amt) external {
        calls++;
        address a = _actor(actorSeed);
        amt = bound(amt, 1e6, 2000e6);
        usdc.mint(a, amt);
        vm.startPrank(a);
        usdc.approve(address(router), amt);
        try router.buy(address(b), amt, new uint256[](comps.length), 0) {} catch {}
        usdc.approve(address(router), 0);
        vm.stopPrank();
    }

    function sell(uint256 actorSeed, uint256 frac) external {
        calls++;
        address a = _actor(actorSeed);
        uint256 bal = b.balanceOf(a);
        if (bal == 0) return;
        uint256 shares = bound(frac, 1, bal);
        vm.startPrank(a);
        b.approve(address(router), shares);
        try router.sell(address(b), shares, new uint256[](comps.length), 0) {} catch {}
        b.approve(address(router), 0);
        vm.stopPrank();
    }

    /// @dev Moves the most-overweight component toward the most-underweight one by `frac` of the smaller gap.
    function rebalance(uint256 frac, int256 slip) external {
        calls++;
        frac = bound(frac, 1000, 10_000);
        slip = bound(slip, -50, 90);
        uint256[] memory v = b.componentValues();
        uint16[] memory t = b.targets();
        uint256 nav;
        for (uint256 i; i < v.length; ++i) {
            nav += v[i];
        }
        if (nav == 0) return;
        int256 maxOver;
        int256 maxUnder;
        uint8 from;
        uint8 to;
        for (uint256 i; i < v.length; ++i) {
            int256 gap = int256(v[i]) - int256(nav * t[i] / 10_000);
            if (gap > maxOver) (maxOver, from) = (gap, uint8(i));
            if (-gap > maxUnder) (maxUnder, to) = (-gap, uint8(i));
        }
        if (maxOver == 0 || maxUnder == 0 || from == to) return;
        uint256 usd = uint256(maxOver < maxUnder ? maxOver : maxUnder) * frac / 10_000;
        uint256 amt = usd * 1e8 / uint256(feeds[from].answer());
        if (amt == 0) return;

        adapter.setSlippage(slip);
        b.accrueFee(); // rebalance accrues first; ts must be unchanged by the trades themselves
        uint256 ts = b.totalSupply();
        IBasket.Trade[] memory tr = new IBasket.Trade[](1);
        tr[0] = IBasket.Trade({from: from, to: to, amountIn: amt});
        vm.prank(keeper);
        try b.executeRebalance(tr) {
            rebalancesOk++;
            // independent post-checks
            if (b.totalSupply() != ts) rebalanceViolation = 1;
            if (b.lossBudgetUsed() > 300e14) rebalanceViolation = 2;
            uint256[] memory va = b.componentValues();
            uint16[] memory ta = b.targets();
            uint256 navA;
            for (uint256 i; i < va.length; ++i) {
                navA += va[i];
            }
            if (navA * 10_000 < nav * (10_000 - 150)) rebalanceViolation = 3;
            for (uint256 i; i < va.length; ++i) {
                uint256 w = va[i] * 1e18 / navA;
                uint256 tg = uint256(ta[i]) * 1e14;
                uint256 d = w > tg ? w - tg : tg - w;
                if (d > b.bandOf(ta[i]) + 1) rebalanceViolation = 10 + i;
            }
        } catch (bytes memory err) {
            bytes4 sel = err.length >= 4 ? bytes4(err) : bytes4(0);
            failCount[sel]++;
        }
        adapter.setSlippage(0);
    }
}
