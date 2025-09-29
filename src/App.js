import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Papa from "papaparse";
import { addMonths, isSameMonth, parse, isValid } from "date-fns";
import dayjs from "dayjs";
import { Card, Row, Col, Typography, Switch, Select, DatePicker, Space, Divider, Badge, Spin } from "antd";

const { Title, Text } = Typography;
const { Option } = Select;

export default function App() {
  const [originalData, setOriginalData] = useState([]);
  const [data, setData] = useState([]);
  const [currentMonthPayments, setCurrentMonthPayments] = useState([]);
  const [nextMonthPayments, setNextMonthPayments] = useState([]);
  const [followingMonthPayments, setFollowingMonthPayments] = useState([]);

  // Filter states
  const [hidePaidPayments, setHidePaidPayments] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  const categorizePayments = useCallback((validData) => {
    const today = new Date();
    const currentMonth = today;
    const nextMonth = addMonths(today, 1);
    const followingMonth = addMonths(today, 2);

    // Apply filters inline
    let filteredData = [...validData];

    // Filter by apartment
    if (selectedApartment !== "all") {
      filteredData = filteredData.filter(payment => payment.Apartment === selectedApartment);
    }

    // Filter by month
    if (selectedMonth) {
      const selectedDate = new Date(selectedMonth);
      if (isValid(selectedDate)) {
        filteredData = filteredData.filter(payment =>
          isValid(payment["Due Date"]) && isSameMonth(payment["Due Date"], selectedDate)
        );
      }
    }

    // Hide paid payments (past due)
    if (hidePaidPayments) {
      filteredData = filteredData.filter(payment => payment["Due Date"] >= today);
    }

    const currentMonthPayments = filteredData.filter(
      (payment) =>
        payment["Due Date"] >= today && isSameMonth(payment["Due Date"], currentMonth)
    );

    const nextMonthPayments = filteredData.filter(
      (payment) =>
        payment["Due Date"] >= today && isSameMonth(payment["Due Date"], nextMonth)
    );

    const followingMonthPayments = filteredData.filter(
      (payment) =>
        payment["Due Date"] >= today && isSameMonth(payment["Due Date"], followingMonth)
    );

    setCurrentMonthPayments(currentMonthPayments);
    setNextMonthPayments(nextMonthPayments);
    setFollowingMonthPayments(followingMonthPayments);

    setData(filteredData.sort((a, b) => a["Due Date"] - b["Due Date"]));
  }, [hidePaidPayments, selectedApartment, selectedMonth]);

  const parseData = (csvData) => {
    const result = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });
    // Filter out entries with empty apartments
    return result.data.filter((entry) => entry.Apartment && entry.Apartment.trim() !== "");
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaHqj4DcMqTzY5EPS6U20Qhhg6_2wZQxNz1E8srJ1lItTcY1CujZXG5h7nwrFCXOu4zWifKQOgIyN1/pub?output=csv";
    axios
      .get(url)
      .then((response) => {
        const result = parseData(response.data);
        const parsedResult = result.map((payment) => {
          const dueDate = parse(payment["Due Date"], "dd-MM-yyyy", new Date());
          return { ...payment, "Due Date": dueDate };
        }).filter((payment) => isValid(payment["Due Date"]));

        setOriginalData(parsedResult);
        categorizePayments(parsedResult);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [categorizePayments]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-categorize payments when filters change
  useEffect(() => {
    if (originalData.length > 0) {
      categorizePayments(originalData);
    }
  }, [categorizePayments, originalData]);

  const getUniqueApartments = (data) => {
    const apartments = data.map(payment => payment.Apartment).filter(apt => apt.trim() !== "");
    return [...new Set(apartments)].sort();
  };

  const getPaymentStatus = (payment) => {
    const today = new Date();
    const dueDate = payment["Due Date"];
    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return { status: "PAID", color: "green", days: null };
    if (daysDiff <= 7) return { status: "DUE SOON", color: "orange", days: daysDiff };
    return { status: "UPCOMING", color: "blue", days: daysDiff };
  };

  const parseAmount = (amountStr) => {
    if (!amountStr) return 0;
    // Remove commas, spaces, and any currency symbols, then parse
    const cleanAmount = String(amountStr).replace(/[,\s]/g, '').replace(/[^\d.-]/g, '');
    return parseFloat(cleanAmount) || 0;
  };

  const calculateSummary = () => {
    const today = new Date();
    const upcomingPayments = data.filter(payment => payment["Due Date"] >= today);
    const currentMonthTotal = currentMonthPayments.reduce((sum, payment) => {
      const amount = parseAmount(payment.Amount);
      return sum + amount;
    }, 0);
    const upcomingTotal = upcomingPayments.reduce((sum, payment) => {
      const amount = parseAmount(payment.Amount);
      return sum + amount;
    }, 0);

    return {
      upcomingCount: upcomingPayments.length,
      upcomingTotal,
      currentMonthTotal,
      currentMonthCount: currentMonthPayments.length
    };
  };



  const renderPayments = (payments, title) => (
    <div style={{ marginBottom: "20px" }}>
      <Title level={3}>{title}</Title>
      {payments.length > 0 ? (
        <Row gutter={[16, 16]}>
          {payments.map((payment, index) => {
            const statusInfo = getPaymentStatus(payment);
            return (
              <Col key={index} xs={24} sm={12} md={8}>
                <Card
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '16px' }}>{payment.Apartment}</Text>
                      <Badge 
                        color={statusInfo.color} 
                        text={statusInfo.status}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  }
                  bordered={false}
                  style={{ 
                    backgroundColor: statusInfo.status === "PAID" ? "#f6ffed" : 
                                    statusInfo.status === "DUE SOON" ? "#fff7e6" : "#f0f9ff",
                    borderLeft: `4px solid ${statusInfo.color === 'green' ? '#52c41a' : 
                                              statusInfo.color === 'orange' ? '#fa8c16' : '#1890ff'}`
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                      {payment.Amount}
                    </Text>
                    {statusInfo.days !== null && (
                      <Text style={{ marginLeft: '8px', color: '#666' }}>
                        {statusInfo.days === 0 ? '(Due today)' : 
                         statusInfo.days > 0 ? `(${statusInfo.days} days)` : ''}
                      </Text>
                    )}
                  </div>
                  <p style={{ margin: '4px 0' }}>
                    <Text type="secondary">Due:</Text>{" "}
                    <Text strong>
                      {isValid(payment["Due Date"]) ? payment["Due Date"].toLocaleDateString() : "Invalid Date"}
                    </Text>
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <Text type="secondary">Per Person:</Text> <Text>{payment["Per Person"]}</Text>
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <Text type="secondary">Check by:</Text> <Text>{payment["Check by"]}</Text>
                  </p>
                  {payment.Notes && (
                    <p style={{ margin: '4px 0' }}>
                      <Text type="secondary">Notes:</Text> <Text>{payment.Notes}</Text>
                    </p>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>No payments found for the current filters</Text>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", paddingTop: "100px" }}>
        <Spin size="large" />
        <div style={{ marginTop: "16px" }}>
          <Text type="secondary">Loading payment data...</Text>
        </div>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2} style={{ textAlign: "center", marginBottom: "30px" }}>
        Installment Details
      </Title>

      {/* Summary Cards */}
      <Row gutter={[8, 8]} style={{ marginBottom: "30px" }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                This Month
              </Text>
              <Text strong style={{ fontSize: '16px', color: '#1890ff', display: 'block' }}>
                LE {summary.currentMonthTotal.toLocaleString()}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ({summary.currentMonthCount} payments)
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Upcoming Total
              </Text>
              <Text strong style={{ fontSize: '16px', color: '#52c41a', display: 'block' }}>
                LE {summary.upcomingTotal.toLocaleString()}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ({summary.upcomingCount} payments)
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Properties
              </Text>
              <Text strong style={{ fontSize: '20px', color: '#722ed1', display: 'block' }}>
                {getUniqueApartments(originalData).length}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                All Payments
              </Text>
              <Text strong style={{ fontSize: '20px', color: '#fa8c16', display: 'block' }}>
                {originalData.length}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter Controls */}
      <div style={{ 
        marginBottom: "30px", 
        padding: "16px", 
        backgroundColor: "#f5f5f5", 
        borderRadius: "8px",
        position: "sticky",
        top: "0",
        zIndex: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Hide Paid Payments: </Text>
            <Switch 
              checked={hidePaidPayments} 
              onChange={(checked) => setHidePaidPayments(checked)}
            />
          </div>
          
          <div>
            <Text strong>Apartment: </Text>
            <Select
              value={selectedApartment}
              onChange={(value) => setSelectedApartment(value)}
              style={{ width: 200 }}
              placeholder="Select Apartment"
            >
              <Option value="all">All Apartments</Option>
              {getUniqueApartments(originalData).map(apartment => (
                <Option key={apartment} value={apartment}>{apartment}</Option>
              ))}
            </Select>
          </div>
          
          <div>
            <Text strong>Month Filter: </Text>
            <DatePicker
              picker="month"
              value={selectedMonth ? dayjs(selectedMonth) : null}
              onChange={(date) => setSelectedMonth(date ? date.valueOf() : null)}
              placeholder="Select Month"
              allowClear
            />
          </div>
        </Space>
      </div>
      <Divider />

      {renderPayments(currentMonthPayments, "Current Month Payments")}
      {renderPayments(nextMonthPayments, "Next Month Payments")}
      {renderPayments(followingMonthPayments, "Following Month Payments")}

      <Title level={2} style={{ textAlign: "center", marginTop: "40px" }}>
        All Installments
      </Title>
      {data.length > 0 ? (
        <Row gutter={[16, 16]}>
          {data.map((payment, index) => {
            const statusInfo = getPaymentStatus(payment);
            return (
              <Col key={index} xs={24} sm={12} md={8}>
                <Card
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '16px' }}>{payment.Apartment}</Text>
                      <Badge 
                        color={statusInfo.color} 
                        text={statusInfo.status}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  }
                  bordered={false}
                  style={{ 
                    backgroundColor: statusInfo.status === "PAID" ? "#f6ffed" : 
                                    statusInfo.status === "DUE SOON" ? "#fff7e6" : "#f0f9ff",
                    borderLeft: `4px solid ${statusInfo.color === 'green' ? '#52c41a' : 
                                              statusInfo.color === 'orange' ? '#fa8c16' : '#1890ff'}`
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                      {payment.Amount}
                    </Text>
                    {statusInfo.days !== null && (
                      <Text style={{ marginLeft: '8px', color: '#666' }}>
                        {statusInfo.days === 0 ? '(Due today)' : 
                         statusInfo.days > 0 ? `(${statusInfo.days} days)` : ''}
                      </Text>
                    )}
                  </div>
                  <p style={{ margin: '4px 0' }}>
                    <Text type="secondary">Due:</Text>{" "}
                    <Text strong>
                      {isValid(payment["Due Date"]) ? payment["Due Date"].toLocaleDateString() : "Invalid Date"}
                    </Text>
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <Text type="secondary">Per Person:</Text> <Text>{payment["Per Person"]}</Text>
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <Text type="secondary">Check by:</Text> <Text>{payment["Check by"]}</Text>
                  </p>
                  {payment.Notes && (
                    <p style={{ margin: '4px 0' }}>
                      <Text type="secondary">Notes:</Text> <Text>{payment.Notes}</Text>
                    </p>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>No payments found for the current filters</Text>
        </div>
      )}
    </div>
  );
}
