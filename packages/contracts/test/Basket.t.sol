// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Fixture} from "./utils/Fixture.sol";
import {Basket} from "../src/Basket.sol";
import {IBasket} from "../src/interfaces/IBasket.sol";
import {IBasketFactory} from "../src/interfaces/IBasketFactory.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IPolicyRegistry} from "base-std/interfaces/IPolicyRegistry.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

contract BasketTest is Fixture {
    Basket internal b;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    function setUp() public override {
        super.setUp();
        b = _create(creator, _params3(), 1000e6);
    }

    // ------------------------------------------------------------------ seed / views
    function test_seed_state() public view {
        assertEq(b.totalSupply(), 1000e18);
        assertEq(b.balanceOf(DEAD), 1e18);
        assertEq(b.deadShares(), 1e18);
        assertEq(b.balanceOf(creator), 999e18);
        (address[] memory t, uint256[] memory bal) = b.getBundle();
        assertEq(t[0], address(stocks[0]));
        assertEq(bal[0], 4e8); // $400 / $100
        assertEq(bal[1], 6e8); // $300 / $50
        assertEq(bal[2], 1.5e8); // $300 / $200
        assertEq(b.nav(), 1000e8);
        assertEq(b.navPerShare(), 1e8);
        assertEq(b.creator(), creator);
        assertEq(b.name(), "AI Leaders");
        assertEq(b.symbol(), "AIL");
        assertEq(b.decimals(), 18);
        assertEq(b.notice(), 24 hours);
        uint256[] memory v = b.componentValues();
        assertEq(v[0], 400e8);
        assertEq(v[1], 300e8);
        assertEq(v[2], 300e8);
    }

    function test_initialize_onlyFactory() public {
        IBasketFactory.BasketParams memory p = _params3();
        vm.expectRevert(Basket.NotFactory.selector);
        b.initialize(creator, p);
        vm.prank(address(factory));
        vm.expectRevert(Basket.AlreadyInitialized.selector);
        b.initialize(creator, p);
        // implementation is locked
        Basket impl = Basket(factory.implementation());
        vm.prank(address(factory));
        vm.expectRevert(Basket.AlreadyInitialized.selector);
        impl.initialize(creator, p);
    }

    function test_seed_onlyFactory_once() public {
        vm.expectRevert(Basket.NotFactory.selector);
        b.seed(1e18, creator);
        vm.prank(address(factory));
        vm.expectRevert(Basket.AlreadySeeded.selector);
        b.seed(1e18, creator);
    }

    // ------------------------------------------------------------------ issue
    function test_issue_pullsMulDivUp() public {
        uint256 shares = 333_333_333_333_333_337; // odd => forces rounding
        uint256[] memory exp = new uint256[](3);
        exp[0] = FixedPointMathLib.mulDivUp(4e8, shares, 1000e18);
        exp[1] = FixedPointMathLib.mulDivUp(6e8, shares, 1000e18);
        exp[2] = FixedPointMathLib.mulDivUp(1.5e8, shares, 1000e18);
        for (uint256 i; i < 3; ++i) {
            stocks[i].mint(asha, exp[i]);
            vm.prank(asha);
            stocks[i].approve(address(b), exp[i]);
        }
        vm.expectEmit(address(b));
        emit IBasket.Issued(asha, shares, exp);
        vm.prank(asha);
        uint256[] memory amts = b.issue(shares, asha);
        for (uint256 i; i < 3; ++i) {
            assertEq(amts[i], exp[i]);
            assertEq(IB20(address(stocks[i])).balanceOf(asha), 0);
        }
        assertEq(b.balanceOf(asha), shares);
        assertEq(b.totalSupply(), 1000e18 + shares);
        assertEq(stocks[0].allowance(asha, address(b)), 0);
    }

    function test_issue_reverts_zero_and_noAllowance() public {
        vm.prank(asha);
        vm.expectRevert(Basket.ZeroAmount.selector);
        b.issue(0, asha);
        vm.prank(asha);
        vm.expectRevert();
        b.issue(1e18, asha);
    }

    function test_issue_pausedButRedeemNot() public {
        _issueInKind(asha, b, 10e18);
        vm.prank(owner);
        factory.setPaused(true);
        vm.prank(asha);
        vm.expectRevert(Basket.ProtocolPaused.selector);
        b.issue(1e18, asha);
        vm.prank(asha);
        (uint256[] memory amts,) = b.redeem(10e18, asha);
        assertGt(amts[0], 0);
        assertEq(b.balanceOf(asha), 0);
    }

    function test_issue_revertsWhenOnlyDeadSharesLeft() public {
        vm.prank(creator);
        b.redeem(999e18, creator);
        assertEq(b.totalSupply(), 1e18);
        address[] memory comps = b.components();
        for (uint256 i; i < comps.length; ++i) {
            IB20(comps[i]).mint(asha, 1e8);
            vm.prank(asha);
            IB20(comps[i]).approve(address(b), 1e8);
        }
        vm.prank(asha);
        vm.expectRevert(Basket.BasketEmpty.selector);
        b.issue(1e15, asha);
    }

    function test_issue_tvlCap() public {
        // NAV $1000, default cap $5000 -> max ~4000 more shares
        _issueInKind(asha, b, 4000e18);
        assertEq(b.nav(), 5000e8);
        uint256[] memory amts = b.previewIssue(1e18);
        for (uint256 i; i < 3; ++i) {
            stocks[i].mint(ben, amts[i]);
            vm.prank(ben);
            stocks[i].approve(address(b), amts[i]);
        }
        vm.prank(ben);
        vm.expectRevert(abi.encodeWithSelector(Basket.TvlCapExceeded.selector, 5001e8, 5000e8));
        b.issue(1e18, ben);
        vm.prank(owner);
        factory.setBasketTvlCap(address(b), type(uint256).max); // uncapped
        vm.prank(ben);
        b.issue(1e18, ben);
        assertEq(b.balanceOf(ben), 1e18);
    }

    // ------------------------------------------------------------------ redeem
    function test_redeem_paysMulDiv() public {
        uint256 shares = 123_456_789_123_456_789;
        uint256[] memory exp = new uint256[](3);
        exp[0] = 4e8 * shares / 1000e18;
        exp[1] = 6e8 * shares / 1000e18;
        exp[2] = 1.5e8 * shares / 1000e18;
        vm.expectEmit(address(b));
        emit IBasket.Redeemed(creator, ben, shares, exp, 0);
        vm.prank(creator);
        (uint256[] memory amts, uint256 mask) = b.redeem(shares, ben);
        assertEq(mask, 0);
        for (uint256 i; i < 3; ++i) {
            assertEq(amts[i], exp[i]);
            assertEq(stocks[i].balanceOf(ben), exp[i]);
        }
        assertEq(b.totalSupply(), 1000e18 - shares);
    }

    function test_redeem_reverts_insufficientShares() public {
        vm.prank(asha);
        vm.expectRevert();
        b.redeem(1, asha);
        vm.prank(asha);
        vm.expectRevert(Basket.ZeroAmount.selector);
        b.redeem(0, asha);
    }

    function testFuzz_roundTrip_neverProfits(uint256 shares, uint256 waitSecs) public {
        shares = bound(shares, 1, 3000e18);
        waitSecs = bound(waitSecs, 0, 400 days);
        uint256[] memory paid = _issueInKind(asha, b, shares);
        if (waitSecs > 0) vm.warp(block.timestamp + waitSecs);
        _refreshFeeds();
        vm.prank(asha);
        (uint256[] memory got,) = b.redeem(shares, asha);
        for (uint256 i; i < 3; ++i) {
            assertLe(got[i], paid[i], "round trip profit");
        }
    }

    /// @dev Many tiny issue/redeem cycles must never extract value from other holders.
    function testFuzz_dustCycles_doNotDrain(uint256 shares, uint8 cycles) public {
        shares = bound(shares, 1, 1e12);
        cycles = uint8(bound(cycles, 1, 20));
        (, uint256[] memory before) = b.getBundle();
        for (uint256 k; k < cycles; ++k) {
            _issueInKind(asha, b, shares);
            vm.prank(asha);
            b.redeem(shares, asha);
        }
        (, uint256[] memory afterB) = b.getBundle();
        for (uint256 i; i < 3; ++i) {
            assertGe(afterB[i], before[i]);
        }
    }

    function test_redeem_policyBlocked_creditsOwed() public {
        _issueInKind(asha, b, 100e18);
        // Block `asha` as a receiver of tBBB via the real PolicyRegistry precompile.
        address[] memory accts = new address[](1);
        accts[0] = asha;
        uint64 pid = StdPrecompiles.POLICY_REGISTRY
            .createPolicyWithAccounts(address(this), IPolicyRegistry.PolicyType.BLOCKLIST, accts);
        stocks[1].updatePolicy(B20Constants.TRANSFER_RECEIVER_POLICY, pid);

        (, uint256[] memory balsBefore) = b.getBundle();
        uint256 ts = b.totalSupply();
        vm.prank(asha);
        (uint256[] memory amts, uint256 mask) = b.redeem(100e18, asha);
        assertEq(mask, 2); // bit 1 = tBBB
        for (uint256 i; i < 3; ++i) {
            uint256 proRata = balsBefore[i] * 100e18 / ts;
            uint256 paid = stocks[i].balanceOf(asha);
            uint256 owedAmt = b.owed(asha, address(stocks[i]));
            assertEq(paid + owedAmt, proRata, "owed + paid == pro-rata");
            assertEq(amts[i], proRata);
        }
        assertEq(stocks[1].balanceOf(asha), 0);
        uint256 owedB = b.owed(asha, address(stocks[1]));
        assertGt(owedB, 0);
        assertEq(b.totalOwed(address(stocks[1])), owedB);
        // owed tokens are excluded from the bundle (other holders unaffected)
        (, uint256[] memory balsAfter) = b.getBundle();
        assertEq(balsAfter[1], balsBefore[1] - owedB);
        assertEq(stocks[1].balanceOf(address(b)), balsAfter[1] + owedB);

        // claim to blocked address still fails; claim to a fresh address works
        vm.prank(asha);
        vm.expectRevert();
        b.claimOwed(address(stocks[1]), asha);
        address alt = makeAddr("ashaAlt");
        vm.expectEmit(address(b));
        emit IBasket.OwedClaimed(asha, address(stocks[1]), alt, owedB);
        vm.prank(asha);
        b.claimOwed(address(stocks[1]), alt);
        assertEq(stocks[1].balanceOf(alt), owedB);
        assertEq(b.owed(asha, address(stocks[1])), 0);
        assertEq(b.totalOwed(address(stocks[1])), 0);
        vm.prank(asha);
        vm.expectRevert(Basket.NothingOwed.selector);
        b.claimOwed(address(stocks[1]), alt);
    }

    function test_redeem_tokenTransferPaused_creditsOwed() public {
        _issueInKind(asha, b, 10e18);
        stocks[2].grantRole(B20Constants.PAUSE_ROLE, address(this));
        IB20.PausableFeature[] memory f = new IB20.PausableFeature[](1);
        f[0] = IB20.PausableFeature.TRANSFER;
        stocks[2].pause(f);
        vm.prank(asha);
        (, uint256 mask) = b.redeem(10e18, asha);
        assertEq(mask, 4);
        assertGt(b.owed(asha, address(stocks[2])), 0);
    }

    function test_redeem_viaMockCall_policyRevert() public {
        // vm.mockCallRevert variant (as specified in §3.5) on a single component transfer
        _issueInKind(asha, b, 10e18);
        vm.mockCallRevert(
            address(stocks[0]),
            abi.encodeWithSelector(IB20.transfer.selector, asha),
            abi.encodeWithSelector(IB20.PolicyForbids.selector, B20Constants.TRANSFER_RECEIVER_POLICY, uint64(7))
        );
        vm.prank(asha);
        (, uint256 mask) = b.redeem(10e18, asha);
        assertEq(mask, 1);
        vm.clearMockedCalls();
    }

    // ------------------------------------------------------------------ fee
    function test_fee_oneYear_exact() public {
        vm.warp(block.timestamp + 365 days);
        uint256 ts = 1000e18;
        uint256 exp = ts * 100 * 365 days / (365 days * 10_000 - 100 * 365 days); // = ts/99
        uint256 c = exp * 8000 / 10_000;
        vm.expectEmit(address(b));
        emit IBasket.FeeAccrued(c, exp - c);
        uint256 minted = b.accrueFee();
        assertEq(minted, exp);
        assertEq(b.balanceOf(creator), 999e18 + c);
        assertEq(b.balanceOf(treasury), exp - c);
        // dilution is exactly 1%: minted / (ts + minted) == 1/100
        assertApproxEqAbs(minted * 1e18 / (ts + minted), 0.01e18, 1);
        // second accrue in same block mints 0
        assertEq(b.accrueFee(), 0);
        assertEq(b.lastAccrual(), block.timestamp);
    }

    function testFuzz_fee_bound(uint256 dt) public {
        dt = bound(dt, 0, 365 days);
        uint256 ts = b.totalSupply();
        vm.warp(block.timestamp + dt);
        uint256 minted = b.accrueFee();
        // minted/(ts+minted) <= fee*dt/YEAR  (dilution-correct form of "mint <= ts*fee*dt/YEAR + 1")
        assertLe(minted * (365 days * 10_000 - 100 * dt), ts * 100 * dt);
        assertLe(minted, ts * 100 * dt / (365 days * 10_000 - 100 * dt) + 1);
        assertEq(b.accrueFee(), 0);
    }

    function test_fee_zeroFeeBasket() public {
        Basket z = _create(creator, _params2(0), 100e6);
        vm.warp(block.timestamp + 100 days);
        assertEq(z.accrueFee(), 0);
        assertEq(z.totalSupply(), 100e18);
    }

    function test_fee_noTreasury_allToCreator() public {
        vm.prank(owner);
        factory.setTreasury(address(0));
        vm.warp(block.timestamp + 365 days);
        uint256 minted = b.accrueFee();
        assertEq(b.balanceOf(creator), 999e18 + minted);
    }

    function test_fee_accruesBeforeIssueAndPreviewMatches() public {
        vm.warp(block.timestamp + 30 days);
        _refreshFeeds();
        uint256[] memory prev = b.previewIssue(50e18);
        uint256 pend = b.pendingFee();
        assertGt(pend, 0);
        uint256[] memory amts = _issueInKind(asha, b, 50e18);
        for (uint256 i; i < 3; ++i) {
            assertEq(prev[i], amts[i]);
        }
        assertEq(b.totalSupply(), 1000e18 + pend + 50e18);
    }

    function test_previewRedeem_matches() public {
        vm.warp(block.timestamp + 10 days);
        uint256[] memory prev = b.previewRedeem(10e18);
        vm.prank(creator);
        (uint256[] memory amts,) = b.redeem(10e18, creator);
        for (uint256 i; i < 3; ++i) {
            assertEq(prev[i], amts[i]);
        }
    }

    // ------------------------------------------------------------------ multiplier (split)
    function test_multiplierChange_accountingIntact() public {
        _issueInKind(asha, b, 100e18);
        uint256 navBefore = b.nav();
        uint256[] memory pi = b.previewIssue(7e18);
        uint256[] memory pr = b.previewRedeem(7e18);
        (, uint256[] memory bals) = b.getBundle();

        // 2:1 split on tAAA: multiplier 1 -> 2, underlying px halves, feed (px x multiplier per raw) unchanged.
        stocks[0].updateMultiplier(2e18);
        assertEq(stocks[0].multiplier(), 2e18);
        _setPrice(0, 100e8);

        assertEq(b.nav(), navBefore);
        (, uint256[] memory bals2) = b.getBundle();
        uint256[] memory pi2 = b.previewIssue(7e18);
        uint256[] memory pr2 = b.previewRedeem(7e18);
        for (uint256 i; i < 3; ++i) {
            assertEq(bals2[i], bals[i]);
            assertEq(pi2[i], pi[i]);
            assertEq(pr2[i], pr[i]);
        }
        // and a full round trip still works on raw balances
        vm.prank(asha);
        (uint256[] memory got,) = b.redeem(100e18, asha);
        assertEq(stocks[0].balanceOf(asha), got[0]);
    }
}
