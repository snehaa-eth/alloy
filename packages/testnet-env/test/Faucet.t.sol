// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";
import {Faucet} from "../src/Faucet.sol";

/// @dev Runs against the real B20 precompiles hosted in-process by `base-forge` (no fork needed).
contract FaucetTest is Test {
    Faucet faucet;
    IB20 usdc;
    IB20 stock;
    address admin = makeAddr("admin");
    address judge = makeAddr("judge");
    address judge2 = makeAddr("judge2");

    function setUp() public {
        vm.warp(1_800_000_000);
        vm.startPrank(admin);
        usdc = IB20(
            StdPrecompiles.B20_FACTORY
                .createB20(
                    IB20Factory.B20Variant.STABLECOIN,
                    keccak256("faucet-test-usdc"),
                    abi.encode(IB20Factory.B20StablecoinCreateParams(1, "Alloy Test USDC", "tUSDC", admin, "USD")),
                    new bytes[](0)
                )
        );
        stock = IB20(
            StdPrecompiles.B20_FACTORY
                .createB20(
                    IB20Factory.B20Variant.ASSET,
                    keccak256("faucet-test-stock"),
                    abi.encode(IB20Factory.B20AssetCreateParams(1, "Alloy Test NVIDIA", "tNVDAc", admin, 8)),
                    new bytes[](0)
                )
        );
        faucet = new Faucet(admin, address(usdc), 1_000e6);
        usdc.grantRole(B20Constants.MINT_ROLE, address(faucet));
        vm.stopPrank();
    }

    function test_b20Setup() public view {
        assertEq(usdc.decimals(), 6);
        assertEq(stock.decimals(), 8);
        assertTrue(usdc.hasRole(B20Constants.MINT_ROLE, address(faucet)));
    }

    function test_drip() public {
        vm.prank(judge);
        faucet.drip();
        assertEq(usdc.balanceOf(judge), 1_000e6);
        assertEq(faucet.lastDrip(judge), block.timestamp);
        assertEq(faucet.availableIn(judge), 1 days);
    }

    function test_cooldown() public {
        vm.prank(judge);
        faucet.drip();
        vm.warp(block.timestamp + 1 days - 1);
        vm.prank(judge);
        vm.expectRevert(abi.encodeWithSelector(Faucet.CoolingDown.selector, block.timestamp + 1));
        faucet.drip();

        vm.warp(block.timestamp + 1);
        vm.prank(judge);
        faucet.drip();
        assertEq(usdc.balanceOf(judge), 2_000e6);
    }

    function test_dripTo_keyedOnRecipient() public {
        vm.prank(judge2);
        faucet.dripTo(judge);
        assertEq(usdc.balanceOf(judge), 1_000e6);
        vm.prank(judge);
        vm.expectRevert(abi.encodeWithSelector(Faucet.CoolingDown.selector, block.timestamp + 1 days));
        faucet.drip();
        // the sponsor itself is unaffected
        vm.prank(judge2);
        faucet.drip();
        assertEq(usdc.balanceOf(judge2), 1_000e6);
    }

    function test_zeroRecipient() public {
        vm.expectRevert(Faucet.ZeroRecipient.selector);
        faucet.dripTo(address(0));
    }

    function test_dailyCap() public {
        vm.prank(admin);
        faucet.setMaxDripsPerDay(1);
        vm.prank(judge);
        faucet.drip();
        vm.prank(judge2);
        vm.expectRevert(Faucet.DailyCapReached.selector);
        faucet.drip();
        vm.warp(block.timestamp + 1 days);
        vm.prank(judge2);
        faucet.drip();
    }

    function test_addStockDrip() public {
        vm.startPrank(admin);
        stock.grantRole(B20Constants.MINT_ROLE, address(faucet));
        faucet.setDrip(address(stock), 2e8);
        vm.stopPrank();
        assertEq(faucet.tokens().length, 2);

        vm.prank(judge);
        faucet.drip();
        assertEq(usdc.balanceOf(judge), 1_000e6);
        assertEq(stock.balanceOf(judge), 2e8);

        // disabling a drip keeps the token list but mints nothing
        vm.prank(admin);
        faucet.setDrip(address(stock), 0);
        vm.prank(judge2);
        faucet.drip();
        assertEq(stock.balanceOf(judge2), 0);
        // re-enabling does not duplicate the entry
        vm.prank(admin);
        faucet.setDrip(address(stock), 1e8);
        assertEq(faucet.tokens().length, 2);
    }

    function test_withoutMintRole_reverts() public {
        vm.prank(admin);
        usdc.revokeRole(B20Constants.MINT_ROLE, address(faucet));
        vm.prank(judge);
        vm.expectRevert();
        faucet.drip();
    }

    function test_onlyOwner() public {
        vm.startPrank(judge);
        vm.expectRevert(Faucet.NotOwner.selector);
        faucet.setDrip(address(usdc), 1);
        vm.expectRevert(Faucet.NotOwner.selector);
        faucet.setCooldown(0);
        vm.expectRevert(Faucet.NotOwner.selector);
        faucet.setMaxDripsPerDay(0);
        vm.stopPrank();
    }

    function test_setCooldown() public {
        vm.prank(admin);
        faucet.setCooldown(1 hours);
        vm.prank(judge);
        faucet.drip();
        vm.warp(block.timestamp + 1 hours);
        vm.prank(judge);
        faucet.drip();
        assertEq(usdc.balanceOf(judge), 2_000e6);
    }
}
