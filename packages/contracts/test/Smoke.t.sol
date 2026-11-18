// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {IB20Asset} from "base-std/interfaces/IB20Asset.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";

contract SmokeTest is Test {
    function test_b20_precompile_smoke() public {
        bytes[] memory init = new bytes[](2);
        init[0] = abi.encodeWithSignature("grantRole(bytes32,address)", B20Constants.MINT_ROLE, address(this));
        init[1] = abi.encodeWithSignature("grantRole(bytes32,address)", B20Constants.OPERATOR_ROLE, address(this));
        bytes memory params = abi.encode(
            IB20Factory.B20AssetCreateParams({
                version: 1, name: "Test NVDA", symbol: "tNVDA", initialAdmin: address(this), decimals: 8
            })
        );
        address t = StdPrecompiles.B20_FACTORY.createB20(IB20Factory.B20Variant.ASSET, bytes32("x"), params, init);
        emit log_named_address("token", t);
        emit log_named_bytes("code", t.code);
        IB20Asset a = IB20Asset(t);
        assertEq(a.decimals(), 8);
        a.mint(address(this), 1e8);
        a.transfer(address(0xBEEF), 4e7);
        assertEq(a.balanceOf(address(0xBEEF)), 4e7);
        a.updateMultiplier(2e18);
        assertEq(a.multiplier(), 2e18);
        assertEq(a.balanceOf(address(0xBEEF)), 4e7, "raw balance unchanged");
    }
}
