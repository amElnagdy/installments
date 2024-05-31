import { useEffect, useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import { addMonths, isSameMonth, parse } from "date-fns";
import { Card, Row, Col, Typography } from "antd";

const { Title, Text } = Typography;

export default function App() {
  const [data, setData] = useState([]);
  const [nextPayments, setNextPayments] = useState([]);
  const [displayMonth, setDisplayMonth] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaHqj4DcMqTzY5EPS6U20Qhhg6_2wZQxNz1E8srJ1lItTcY1CujZXG5h7nwrFCXOu4zWifKQOgIyN1/pub?output=csv";
    axios
      .get(url)
      .then((response) => {
        const result = parseData(response.data);
        setData(result);
        findNextPayments(result);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const parseData = (csvData) => {
    const result = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });
    // Filter out entries with empty apartments
    return result.data.filter((entry) => entry.Apartment.trim() !== "");
  };

  const findNextPayments = (data) => {
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    const followingMonth = addMonths(today, 2);

    const parsedData = data.map((payment) => {
      const dueDate = parse(payment["Due Date"], "dd-MM-yyyy", new Date());
      return { ...payment, "Due Date": dueDate };
    });

    const validData = parsedData.filter(
      (payment) => !isNaN(payment["Due Date"])
    );

    const nextMonthPayments = validData.filter(
      (payment) =>
        payment["Due Date"] >= today &&
        isSameMonth(payment["Due Date"], nextMonth)
    );

    if (nextMonthPayments.length > 0) {
      setNextPayments(nextMonthPayments);
      setDisplayMonth("Next Month");
    } else {
      const followingMonthPayments = validData.filter(
        (payment) =>
          payment["Due Date"] >= today &&
          isSameMonth(payment["Due Date"], followingMonth)
      );

      if (followingMonthPayments.length > 0) {
        setNextPayments(followingMonthPayments);
        setDisplayMonth("Following Month");
      } else {
        setNextPayments([]);
        setDisplayMonth("");
      }
    }

    setData(validData.sort((a, b) => a["Due Date"] - b["Due Date"]));
  };

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2} style={{ textAlign: "center" }}>
        Installment Details
      </Title>

      {nextPayments.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <Title level={3}>{displayMonth} Payments</Title>
          <Row gutter={[16, 16]}>
            {nextPayments.map((payment, index) => (
              <Col key={index} xs={24} sm={12} md={8}>
                <Card
                  title={`${payment.Apartment}`}
                  bordered={false}
                  style={{ backgroundColor: "#FFD700" }} // Highlight color for next payments
                >
                  <p>
                    <Text strong>Due Date:</Text>{" "}
                    {payment["Due Date"].toLocaleDateString()}
                  </p>
                  <p>
                    <Text strong>Total Amount:</Text> {payment.Amount}
                  </p>
                  <p>
                    <Text strong>Per Person:</Text> {payment["Per Person"]}
                  </p>
                  <p>
                    <Text strong>Check by:</Text> {payment["Check by"]}
                  </p>
                  <p>
                    <Text strong>Notes:</Text> {payment.Notes || "None"}
                  </p>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
      <Title level={2} style={{ textAlign: "center" }}>
        All Installments
      </Title>
      <Row gutter={[16, 16]}>
        {data.map((payment, index) => {
          const isPastDue = payment["Due Date"] < new Date();
          return (
            <Col key={index} xs={24} sm={12} md={8}>
              <Card
                title={`${payment.Apartment}`}
                bordered={false}
                style={{ backgroundColor: isPastDue ? "#AFE1AF" : "white" }}
              >
                <p>
                  <Text strong>Due Date:</Text>{" "}
                  {new Date(payment["Due Date"]).toLocaleDateString()}
                </p>
                <p>
                  <Text strong>Total Amount:</Text> {payment.Amount}
                </p>
                <p>
                  <Text strong>Per Person:</Text> {payment["Per Person"]}
                </p>
                <p>
                  <Text strong>Check by:</Text> {payment["Check by"]}
                </p>
                <p>
                  <Text strong>Notes:</Text> {payment.Notes || "None"}
                </p>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
