// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice The only B20 surface the faucet needs. The faucet must hold `MINT_ROLE` on every token it drips.
interface IMintable {
    function mint(address to, uint256 amount) external;
}

/// @title Faucet
/// @notice Rate-limited test-token faucet for Alloy's Base Sepolia world. Mints (it never holds inventory) each
///         configured token to the caller, at most once per `cooldown` per recipient.
/// @dev Default config: 1,000 tUSDC (6 dec) per address per 24h. Stock drips can be added with `setDrip`.
///      `dripTo` lets a sponsor/relayer pay gas for a judge's wallet; the cooldown is keyed on the recipient.
contract Faucet {
    address public owner;
    uint256 public cooldown;
    /// @notice Global cap on drips per UTC day (0 = unlimited). Guards against sybil farming draining nothing
    ///         valuable but spamming supply.
    uint256 public maxDripsPerDay;

    address[] internal _tokens;
    mapping(address token => uint256 amount) public dripAmount;
    mapping(address recipient => uint256 timestamp) public lastDrip;
    mapping(uint256 day => uint256 count) public dripsOnDay;

    event Dripped(address indexed recipient, address indexed caller);
    event DripSet(address indexed token, uint256 amount);
    event CooldownSet(uint256 cooldown);
    event MaxDripsPerDaySet(uint256 maxDripsPerDay);

    error NotOwner();
    error CoolingDown(uint256 availableAt);
    error DailyCapReached();
    error ZeroRecipient();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, address usdc, uint256 usdcAmount) {
        owner = owner_;
        cooldown = 1 days;
        _setDrip(usdc, usdcAmount);
    }

    function drip() external {
        _drip(msg.sender);
    }

    function dripTo(address recipient) external {
        _drip(recipient);
    }

    /// @notice Seconds until `recipient` can drip again (0 = now).
    function availableIn(address recipient) external view returns (uint256) {
        uint256 last = lastDrip[recipient];
        if (last == 0 || block.timestamp >= last + cooldown) return 0;
        return last + cooldown - block.timestamp;
    }

    function tokens() external view returns (address[] memory) {
        return _tokens;
    }

    function setDrip(address token, uint256 amount) external onlyOwner {
        _setDrip(token, amount);
    }

    function setCooldown(uint256 cooldown_) external onlyOwner {
        cooldown = cooldown_;
        emit CooldownSet(cooldown_);
    }

    function setMaxDripsPerDay(uint256 max) external onlyOwner {
        maxDripsPerDay = max;
        emit MaxDripsPerDaySet(max);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function _drip(address recipient) internal {
        if (recipient == address(0)) revert ZeroRecipient();
        uint256 last = lastDrip[recipient];
        if (last != 0 && block.timestamp < last + cooldown) revert CoolingDown(last + cooldown);
        uint256 day = block.timestamp / 1 days;
        if (maxDripsPerDay != 0 && dripsOnDay[day] >= maxDripsPerDay) revert DailyCapReached();
        dripsOnDay[day]++;
        lastDrip[recipient] = block.timestamp;

        uint256 n = _tokens.length;
        for (uint256 i; i < n; ++i) {
            address t = _tokens[i];
            uint256 amt = dripAmount[t];
            if (amt != 0) IMintable(t).mint(recipient, amt);
        }
        emit Dripped(recipient, msg.sender);
    }

    function _setDrip(address token, uint256 amount) internal {
        if (dripAmount[token] == 0 && amount != 0) {
            bool known;
            for (uint256 i; i < _tokens.length; ++i) {
                if (_tokens[i] == token) known = true;
            }
            if (!known) _tokens.push(token);
        }
        dripAmount[token] = amount;
        emit DripSet(token, amount);
    }
}
